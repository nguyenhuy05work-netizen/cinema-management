
package com.example.demo.module.booking.service;

import com.example.demo.module.booking.dto.*;
import com.example.demo.module.booking.entity.*;
import com.example.demo.module.booking.enums.BookingStatus;
import com.example.demo.module.booking.repository.TicketRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
public class TicketCheckInService {

    private final TicketRepository ticketRepository;

    // Múi giờ Việt Nam
    private static final ZoneId VIETNAM_ZONE =
            ZoneId.of("Asia/Ho_Chi_Minh");

    @Transactional
    public CheckInResponse checkIn(String ticketCode) {

        // 1. Kiểm tra mã vé
        if (ticketCode == null || ticketCode.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mã vé không được để trống"
            );
        }

        // 2. Tìm vé và khóa bản ghi để tránh quét trùng
        Ticket ticket = ticketRepository
                .findByTicketCodeForUpdate(ticketCode.trim())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy vé"
                ));

        Booking booking = ticket.getBooking();

        // 3. Kiểm tra trạng thái thanh toán
        if (booking.getStatus() != BookingStatus.PAID) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Đơn đặt vé chưa được thanh toán"
            );
        }

        // 4. Kiểm tra vé đã sử dụng chưa
        if (Boolean.TRUE.equals(ticket.getIsCheckedIn())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Vé đã được check-in trước đó"
            );
        }

        // 5. Lấy thông tin suất chiếu
        var showtime = booking.getShowtime();

        // Lấy thời gian hiện tại theo giờ Việt Nam
        LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);

        // Cho phép check-in từ 30 phút trước giờ chiếu
        LocalDateTime earliest =
                showtime.getStartTime().minusMinutes(30);

        // Đến 15 phút sau khi phim bắt đầu
        LocalDateTime latest =
                showtime.getStartTime().plusMinutes(15);

        // Log kiểm tra múi giờ (dùng khi test)
        System.out.println("===== CHECK-IN TIME =====");
        System.out.println("Now VN: " + now);
        System.out.println("Showtime: " + showtime.getStartTime());
        System.out.println("Earliest: " + earliest);
        System.out.println("Latest: " + latest);

        // 6. Kiểm tra thời gian check-in
        if (now.isBefore(earliest) || now.isAfter(latest)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Vé không nằm trong thời gian cho phép check-in"
            );
        }

        // 7. Cập nhật trạng thái check-in
        ticket.setIsCheckedIn(true);
        ticket.setCheckedInAt(now);

        ticketRepository.save(ticket);

        // 8. Trả thông tin vé cho ứng dụng Expo
        return new CheckInResponse(
                true,
                "Check-in thành công",
                ticket.getTicketCode(),
                booking.getId(),
                showtime.getMovie().getTitle(),
                showtime.getHall().getCinema().getName(),
                showtime.getHall().getName(),
                ticket.getSeat().getSeatRow()
                        + ticket.getSeat().getSeatNumber(),
                showtime.getStartTime(),
                now
        );
    }
}
