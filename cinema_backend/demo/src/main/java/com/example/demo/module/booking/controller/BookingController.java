package com.example.demo.module.booking.controller;

import com.example.demo.module.booking.dto.BookingRequest;
import com.example.demo.module.booking.dto.BookingResponse;
import com.example.demo.module.booking.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @PostMapping
    public ResponseEntity<BookingResponse> createBooking(
            @Valid @RequestBody BookingRequest request,
            Authentication authentication
    ) {
        BookingResponse response = bookingService.createBooking(
                request,
                authentication.getName()
        );

        return ResponseEntity.status(201).body(response);
    }

    @GetMapping("/me")
    public List<BookingResponse> getMyBookings(
            Authentication authentication
    ) {
        return bookingService.getMyBookings(
                authentication.getName()
        );
    }

    @GetMapping("/{id}")
    public BookingResponse getBookingById(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return bookingService.getBookingById(
                id,
                authentication.getName()
        );
    }

    @PostMapping("/{id}/cancel")
    public BookingResponse cancelBooking(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return bookingService.cancelBooking(
                id,
                authentication.getName()
        );
    }
}