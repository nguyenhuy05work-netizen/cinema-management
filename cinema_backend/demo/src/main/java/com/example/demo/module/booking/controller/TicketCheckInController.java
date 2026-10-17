package com.example.demo.module.booking.controller;

import com.example.demo.module.booking.dto.*;
import com.example.demo.module.booking.service.TicketCheckInService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tickets")
@RequiredArgsConstructor
public class TicketCheckInController {

    private final TicketCheckInService checkInService;

    @PostMapping("/check-in")
    public ResponseEntity<CheckInResponse> checkIn(
            @Valid @RequestBody CheckInRequest request
    ) {
        return ResponseEntity.ok(
                checkInService.checkIn(request.ticketCode())
        );
    }
}