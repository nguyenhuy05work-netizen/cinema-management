package com.example.demo.module.booking.repository;

import com.example.demo.module.booking.entity.Ticket;
import com.example.demo.module.booking.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {

    boolean existsByBookingShowtimeIdAndSeatIdInAndBookingStatus(
            Long showtimeId,
            List<Long> seatIds,
            BookingStatus status
    );

    List<Ticket> findByBookingIdOrderById(Long bookingId);

    List<Ticket> findByBookingShowtimeIdAndBookingStatus(
            Long showtimeId,
            BookingStatus status
    );
}