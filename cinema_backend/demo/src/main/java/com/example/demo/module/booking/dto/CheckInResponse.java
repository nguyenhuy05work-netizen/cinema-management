package com.example.demo.module.booking.dto;

import java.time.LocalDateTime;

public record CheckInResponse(
        boolean success,
        String message,
        String ticketCode,
        Long bookingId,
        String movieTitle,
        String cinemaName,
        String hallName,
        String seatNumber,
        LocalDateTime startTime,
        LocalDateTime checkedInAt
) {}