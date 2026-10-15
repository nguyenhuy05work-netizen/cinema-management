package com.example.demo.module.booking.controller;

import com.example.demo.module.booking.service.VnpayService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/payments/vnpay")
@RequiredArgsConstructor
public class VnpayController {

    private final VnpayService vnpay;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @PostMapping("/{bookingId}/url")
    public Map<String, String> paymentUrl(
            @PathVariable Long bookingId,
            Authentication authentication,
            HttpServletRequest request
    ) {
        return vnpay.paymentUrl(
                bookingId,
                authentication.getName(),
                request.getRemoteAddr()
        );
    }

    @GetMapping("/ipn")
    public Map<String, String> ipn(
            @RequestParam Map<String, String> params
    ) {
        return vnpay.ipn(params);
    }

    @GetMapping("/return")
    public ResponseEntity<Void> browserReturn(
            @RequestParam Map<String, String> params
    ) {
        Long id = vnpay.verifiedBookingId(params);

        String destination =
                frontendUrl.replaceAll("/+$", "")
                        + "/checkout/"
                        + id
                        + "?vnpay=returned";

        return ResponseEntity
                .status(HttpStatus.SEE_OTHER)
                .location(URI.create(destination))
                .build();
    }
}