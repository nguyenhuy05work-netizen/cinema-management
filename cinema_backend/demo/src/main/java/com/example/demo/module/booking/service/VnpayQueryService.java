
package com.example.demo.module.booking.service;

import com.example.demo.module.booking.entity.Payment;
import com.example.demo.module.booking.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class VnpayQueryService {

    private final PaymentRepository payments;
    private final BookingService bookings;

    private final RestClient restClient = RestClient.create();

    @Value("${app.vnpay.tmn-code:}")
    private String tmnCode;

    @Value("${app.vnpay.hash-secret:}")
    private String hashSecret;

    @Value("${app.vnpay.query-url:https://sandbox.vnpayment.vn/merchant_webapi/api/transaction}")
    private String queryUrl;

    private static final DateTimeFormatter FORMAT =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private static final ZoneId VNPAY_ZONE =
            ZoneId.of("Asia/Ho_Chi_Minh");

    public Map<String, String> queryPayment(
            Long bookingId,
            String serverIp
    ) {
        Payment payment = payments.findByBookingId(bookingId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy giao dịch thanh toán."
                        )
                );

        if (payment.getVnpTxnRef() == null
                || payment.getVnpCreateDate() == null) {
            throw new IllegalStateException(
                    "Giao dịch chưa có thông tin VNPay."
            );
        }

        String requestId =
                UUID.randomUUID().toString().replace("-", "");

        String createDate = LocalDateTime.now(VNPAY_ZONE)
                .format(FORMAT);

        Map<String, String> request = new LinkedHashMap<>();

        request.put("vnp_RequestId", requestId);
        request.put("vnp_Version", "2.1.0");
        request.put("vnp_Command", "querydr");
        request.put("vnp_TmnCode", tmnCode);
        request.put("vnp_TxnRef", payment.getVnpTxnRef());
        request.put(
                "vnp_OrderInfo",
                "Truy van giao dich " + payment.getVnpTxnRef()
        );
        request.put(
                "vnp_TransactionDate",
                payment.getVnpCreateDate()
        );
        request.put("vnp_CreateDate", createDate);
        request.put("vnp_IpAddr", serverIp);

        String requestData = String.join("|",
                request.get("vnp_RequestId"),
                request.get("vnp_Version"),
                request.get("vnp_Command"),
                request.get("vnp_TmnCode"),
                request.get("vnp_TxnRef"),
                request.get("vnp_TransactionDate"),
                request.get("vnp_CreateDate"),
                request.get("vnp_IpAddr"),
                request.get("vnp_OrderInfo")
        );

        request.put("vnp_SecureHash", hmac(requestData));

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restClient.post()
                .uri(queryUrl)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(Map.class);

        if (response == null) {
            throw new IllegalStateException(
                    "VNPay không trả dữ liệu truy vấn."
            );
        }

        String[] signatureFields = {
                "vnp_ResponseId",
                "vnp_Command",
                "vnp_ResponseCode",
                "vnp_Message",
                "vnp_TmnCode",
                "vnp_TxnRef",
                "vnp_Amount",
                "vnp_BankCode",
                "vnp_PayDate",
                "vnp_TransactionNo",
                "vnp_TransactionType",
                "vnp_TransactionStatus",
                "vnp_OrderInfo",
                "vnp_PromotionCode",
                "vnp_PromotionAmount"
        };

        List<String> values = new ArrayList<>();

        for (String field : signatureFields) {
            Object value = response.get(field);
            values.add(value == null ? "" : value.toString());
        }

        String expectedHash = hmac(String.join("|", values));

        String receivedHash = Objects.toString(
                response.get("vnp_SecureHash"), ""
        );

        if (!receivedHash.matches("[a-fA-F0-9]{128}")
                || !MessageDigest.isEqual(
                        expectedHash.getBytes(StandardCharsets.US_ASCII),
                        receivedHash.toLowerCase(Locale.ROOT)
                                .getBytes(StandardCharsets.US_ASCII)
                )) {
            throw new IllegalStateException(
                    "Chữ ký phản hồi QueryDr không hợp lệ."
            );
        }

        if (!tmnCode.equals(response.get("vnp_TmnCode"))
                || !payment.getVnpTxnRef().equals(
                        response.get("vnp_TxnRef")
                )
                || !"querydr".equals(response.get("vnp_Command"))) {
            throw new IllegalStateException(
                    "Thông tin phản hồi VNPay không khớp."
            );
        }

        String responseCode = Objects.toString(
                response.get("vnp_ResponseCode"), ""
        );

        String transactionStatus = Objects.toString(
                response.get("vnp_TransactionStatus"), ""
        );

        if (!"00".equals(responseCode)) {
            return Map.of(
                    "status", "QUERY_FAILED",
                    "responseCode", responseCode
            );
        }

        if (!"00".equals(transactionStatus)) {
            return Map.of(
                    "status", "NOT_PAID",
                    "transactionStatus", transactionStatus
            );
        }

        String amount = Objects.toString(
                response.get("vnp_Amount"), ""
        );

        String transactionNo = Objects.toString(
                response.get("vnp_TransactionNo"), ""
        );

        if (!amount.matches("[0-9]{1,18}")
                || !transactionNo.matches("[0-9]{1,15}")
                || transactionNo.matches("0+")) {
            throw new IllegalStateException(
                    "Dữ liệu giao dịch VNPay không hợp lệ."
            );
        }

        String result = bookings.applyVnpayPayment(
                bookingId,
                new java.math.BigDecimal(amount).movePointLeft(2),
                transactionNo,
                responseCode,
                true
        );

        return Map.of(
                "status", "VERIFIED",
                "bookingResult", result
        );
    }

    private String hmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");

            mac.init(new SecretKeySpec(
                    hashSecret.getBytes(StandardCharsets.UTF_8),
                    "HmacSHA512"
            ));

            return HexFormat.of().formatHex(
                    mac.doFinal(data.getBytes(StandardCharsets.UTF_8))
            );
        } catch (Exception ex) {
            throw new IllegalStateException(
                    "Không thể tạo chữ ký QueryDr.",
                    ex
            );
        }
    }
}
