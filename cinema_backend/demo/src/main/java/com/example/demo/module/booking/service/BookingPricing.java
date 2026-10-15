package com.example.demo.module.booking.service;

import com.example.demo.common.enums.SeatType;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class BookingPricing {

    public BigDecimal price(BigDecimal basePrice, SeatType type) {
        BigDecimal multiplier;

        if (type == SeatType.VIP) {
            multiplier = new BigDecimal("1.25");
        } else if (type == SeatType.COUPLE) {
            multiplier = new BigDecimal("2");
        } else {
            multiplier = BigDecimal.ONE;
        }

        return basePrice
                .multiply(multiplier)
                .setScale(2, RoundingMode.HALF_UP);
    }
}