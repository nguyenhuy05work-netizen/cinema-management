package com.example.demo.module.booking.dto;

import jakarta.validation.constraints.NotBlank;

public record CheckInRequest(
        @NotBlank String ticketCode
) {}