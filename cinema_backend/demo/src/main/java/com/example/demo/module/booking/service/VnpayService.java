package com.example.demo.module.booking.service;

import com.example.demo.common.exception.BadRequestException;
import com.example.demo.module.booking.dto.BookingResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class VnpayService {

    private final BookingService bookings;

    @Value("${app.vnpay.tmn-code:}")
    private String tmnCode;

    @Value("${app.vnpay.hash-secret:}")
    private String hashSecret;

    @Value("${app.vnpay.payment-url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}")
    private String paymentUrl;

    @Value("${app.vnpay.return-url:}")
    private String returnUrl;

    private static final DateTimeFormatter FORMAT =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private static final ZoneId VNPAY_ZONE =
            ZoneId.of("Asia/Ho_Chi_Minh");

    public Map<String, String> paymentUrl(
            Long bookingId,
            String email,
            String clientIp
    ) {
        configured();

        BookingResponse booking =
                bookings.preparePayment(bookingId, email);

        if (!"PENDING".equals(booking.getStatus())) {
            throw new BadRequestException(
                    "Đơn đã hết hạn, đã hủy hoặc đã thanh toán."
            );
        }

        SortedMap<String, String> params = new TreeMap<>();

        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", tmnCode);

        params.put(
                "vnp_Amount",
                booking.getTotalAmount()
                        .movePointRight(2)
                        .toBigIntegerExact()
                        .toString()
        );

        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", "BK" + bookingId);
        params.put("vnp_OrderInfo", "Thanh toan ve phim BK-" + bookingId);
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", returnUrl);
        params.put("vnp_IpAddr", clientIp);

        // Giữ nguyên mã tham chiếu và thời điểm tạo cho cùng booking.
        params.put(
                "vnp_CreateDate",
                FORMAT.format(
                        booking.getCreatedAt()
                                .atZone(ZoneId.systemDefault())
                                .withZoneSameInstant(VNPAY_ZONE)
                )
        );

        params.put(
                "vnp_ExpireDate",
                FORMAT.format(
                        booking.getHoldExpiresAt()
                                .atZoneSameInstant(VNPAY_ZONE)
                )
        );

        String query = canonical(params);

        return Map.of(
                "paymentUrl",
                paymentUrl + "?" + query
                        + "&vnp_SecureHash=" + hmac(query)
        );
    }

    // IPN và Return đều phải có chữ ký hợp lệ.
    // Chỉ IPN được dùng để ghi nhận thanh toán.
    public Long verifiedBookingId(Map<String, String> input) {
        configured();

        String signature = input.get("vnp_SecureHash");

        if (signature == null
                || !signature.matches("[a-fA-F0-9]{128}")) {
            throw new BadRequestException(
                    "Chữ ký VNPay không hợp lệ."
            );
        }

        SortedMap<String, String> fields = new TreeMap<>();

        input.forEach((key, value) -> {
            if (key.startsWith("vnp_")
                    && !key.equals("vnp_SecureHash")
                    && !key.equals("vnp_SecureHashType")
                    && value != null
                    && !value.isEmpty()) {
                fields.put(key, value);
            }
        });

        boolean validSignature = MessageDigest.isEqual(
                hmac(canonical(fields))
                        .getBytes(StandardCharsets.US_ASCII),
                signature.toLowerCase(Locale.ROOT)
                        .getBytes(StandardCharsets.US_ASCII)
        );

        if (!validSignature
                || !tmnCode.equals(input.get("vnp_TmnCode"))) {
            throw new BadRequestException(
                    "Chữ ký VNPay không hợp lệ."
            );
        }

        String reference = input.getOrDefault("vnp_TxnRef", "");

        if (!reference.matches("BK[1-9][0-9]*")) {
            throw new BadRequestException(
                    "Mã đơn VNPay không hợp lệ."
            );
        }

        try {
            return Long.valueOf(reference.substring(2));
        } catch (NumberFormatException ex) {
            throw new BadRequestException(
                    "Mã đơn VNPay không hợp lệ."
            );
        }
    }

    public Map<String, String> ipn(Map<String, String> params) {
        Long id;

        try {
            id = verifiedBookingId(params);
        } catch (BadRequestException ex) {
            return result(
                    "97",
                    "Invalid signature or reference"
            );
        }

        String rawAmount =
                params.getOrDefault("vnp_Amount", "");

        String transaction =
                params.getOrDefault("vnp_TransactionNo", "");

        if (!rawAmount.matches("[0-9]{1,18}")
                || !transaction.matches("[0-9]{1,100}")
                || !params.getOrDefault("vnp_ResponseCode", "")
                        .matches("[0-9]{2}")
                || !params.getOrDefault("vnp_TransactionStatus", "")
                        .matches("[0-9]{2}")) {
            return result("99", "Invalid callback");
        }

        BigDecimal amount =
                new BigDecimal(rawAmount).movePointLeft(2);

        boolean success =
                "00".equals(params.get("vnp_ResponseCode"))
                && "00".equals(params.get("vnp_TransactionStatus"));

        if (success && transaction.matches("0+")) {
            return result("99", "Invalid transaction number");
        }

        String code = bookings.applyVnpayPayment(
                id,
                amount,
                transaction,
                params.get("vnp_ResponseCode"),
                success
        );

        String message = switch (code) {
            case "00" -> "Confirm Success";
            case "01" -> "Order not found";
            case "02" -> "Order already confirmed or expired";
            case "04" -> "Invalid amount";
            default -> "Cannot confirm payment";
        };

        return result(code, message);
    }

    private Map<String, String> result(
            String code,
            String message
    ) {
        return Map.of(
                "RspCode", code,
                "Message", message
        );
    }

    public static String canonical(Map<String, String> fields) {
        return new TreeMap<>(fields)
                .entrySet()
                .stream()
                .filter(e -> e.getValue() != null
                        && !e.getValue().isEmpty())
                .map(e -> encode(e.getKey())
                        + "=" + encode(e.getValue()))
                .collect(
                        java.util.stream.Collectors.joining("&")
                );
    }

    private static String encode(String value) {
        return URLEncoder.encode(
                value,
                StandardCharsets.UTF_8
        );
    }

    private String hmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");

            mac.init(
                    new SecretKeySpec(
                            hashSecret.getBytes(StandardCharsets.UTF_8),
                            "HmacSHA512"
                    )
            );

            return HexFormat.of().formatHex(
                    mac.doFinal(
                            data.getBytes(StandardCharsets.UTF_8)
                    )
            );
        } catch (java.security.GeneralSecurityException ex) {
            throw new IllegalStateException(
                    "Không thể ký giao dịch VNPay.",
                    ex
            );
        }
    }

    private void configured() {
        if (tmnCode.isBlank()
                || hashSecret.isBlank()
                || returnUrl.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Chưa cấu hình merchant VNPay sandbox. "
                            + "Cần VNPAY_TMN_CODE, VNPAY_HASH_SECRET "
                            + "và VNPAY_RETURN_URL."
            );
        }
    }
}