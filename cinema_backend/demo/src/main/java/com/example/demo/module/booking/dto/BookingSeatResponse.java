package com.example.demo.module.booking.dto;

import java.math.BigDecimal;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BookingSeatResponse {

    private Long seatId;

    private String seatNumber;

    private BigDecimal price;

    private String ticketCode;
}