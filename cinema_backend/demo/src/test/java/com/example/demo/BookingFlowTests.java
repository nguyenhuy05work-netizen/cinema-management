package com.example.demo;

import com.example.demo.common.enums.*;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.entity.enums.*;
import com.example.demo.module.booking.dto.*;
import com.example.demo.module.booking.entity.*;
import com.example.demo.module.booking.repository.*;
import com.example.demo.module.booking.service.*;
import com.example.demo.module.cinema.entity.*;
import com.example.demo.module.movie.entity.Movie;
import com.example.demo.module.showtime.entity.*;
import com.example.demo.module.showtime.repository.ShowtimeSeatRepository;
import com.example.demo.module.showtime.service.ShowtimeSeatService;
import com.example.demo.module.user.entity.User;
import com.example.demo.security.JwtTokenProvider;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class BookingFlowTests {

    @Autowired BookingService bookings;
    @Autowired BookingRepository bookingRepository;
    @Autowired TicketRepository tickets;
    @Autowired PaymentRepository payments;
    @Autowired ShowtimeSeatRepository showtimeSeats;
    @Autowired ShowtimeSeatService layouts;
    @Autowired VnpayService vnpay;
    @Autowired EntityManager em;
    @Autowired TransactionTemplate tx;
    @Autowired MockMvc mvc;
    @Autowired JwtTokenProvider jwt;

    Fixture f;

    record Fixture(
            Long showtimeId,
            List<Long> seatIds,
            Long foreignSeatId,
            String email,
            String otherEmail
    ) {}

    @BeforeEach
    void fixture() {
        f = tx.execute(status -> {
            String suffix = UUID.randomUUID().toString();

            City city = City.builder()
                    .name("Test city")
                    .build();
            em.persist(city);

            Cinema cinema = Cinema.builder()
                    .name("Test cinema")
                    .address("Test address")
                    .city(city)
                    .build();
            em.persist(cinema);

            Hall hall = Hall.builder()
                    .name("Test hall")
                    .totalSeats(3)
                    .cinema(cinema)
                    .build();
            em.persist(hall);

            Hall otherHall = Hall.builder()
                    .name("Other hall")
                    .totalSeats(1)
                    .cinema(cinema)
                    .build();
            em.persist(otherHall);

            Movie movie = Movie.builder()
                    .title("Test film")
                    .durationMinutes(90)
                    .status(MovieStatus.NOW_SHOWING)
                    .build();
            em.persist(movie);

            User user = User.builder()
                    .email("owner-" + suffix + "@example.test")
                    .fullName("Owner")
                    .passwordHash("not-used")
                    .status(AccountStatus.ACTIVE)
                    .emailVerified(true)
                    .build();
            em.persist(user);

            User other = User.builder()
                    .email("other-" + suffix + "@example.test")
                    .fullName("Other")
                    .passwordHash("not-used")
                    .status(AccountStatus.ACTIVE)
                    .emailVerified(true)
                    .build();
            em.persist(other);

            Showtime showtime = Showtime.builder()
                    .movie(movie)
                    .hall(hall)
                    .startTime(LocalDateTime.now().plusDays(1))
                    .endTime(LocalDateTime.now().plusDays(1).plusHours(2))
                    .basePrice(new BigDecimal("80000.00"))
                    .build();
            em.persist(showtime);

            List<Long> ids = new ArrayList<>();
            int number = 1;

            for (SeatType type : SeatType.values()) {
                Seat seat = Seat.builder()
                        .hall(hall)
                        .seatRow("A")
                        .seatNumber(String.valueOf(number++))
                        .seatType(type)
                        .build();
                em.persist(seat);
                ids.add(seat.getId());

                em.persist(
                        ShowtimeSeat.builder()
                                .showtime(showtime)
                                .seat(seat)
                                .status(SeatStatus.AVAILABLE)
                                .build()
                );
            }

            Seat foreign = Seat.builder()
                    .hall(otherHall)
                    .seatRow("B")
                    .seatNumber("1")
                    .seatType(SeatType.NORMAL)
                    .build();
            em.persist(foreign);

            return new Fixture(
                    showtime.getId(),
                    ids,
                    foreign.getId(),
                    user.getEmail(),
                    other.getEmail()
            );
        });
    }

    BookingRequest request(List<Long> ids) {
        BookingRequest request = new BookingRequest();
        request.setShowtimeId(f.showtimeId());
        request.setSeatIds(ids);
        return request;
    }

    BookingResponse create(List<Long> ids) {
        return bookings.createBooking(request(ids), f.email());
    }

    Map<String, String> callback(
            BookingResponse booking,
            String amount,
            String code
    ) throws Exception {
        Map<String, String> fields = new TreeMap<>();

        fields.put("vnp_TmnCode", "TESTONLY");
        fields.put("vnp_TxnRef", "BK" + booking.getId());
        fields.put("vnp_Amount", amount);
        fields.put("vnp_ResponseCode", code);
        fields.put("vnp_TransactionStatus", code);
        fields.put("vnp_TransactionNo", "123456789");
        fields.put(
                "vnp_OrderInfo",
                "Thanh toan ve phim BK-" + booking.getId()
        );

        // Ký dữ liệu test độc lập với hàm canonical của ứng dụng.
        String data = fields.entrySet().stream()
                .map(e ->
                        URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8)
                                + "="
                                + URLEncoder.encode(
                                        e.getValue(),
                                        StandardCharsets.UTF_8
                                )
                )
                .collect(java.util.stream.Collectors.joining("&"));

        Mac mac = Mac.getInstance("HmacSHA512");
        mac.init(
                new SecretKeySpec(
                        "test-only-vnpay-secret"
                                .getBytes(StandardCharsets.UTF_8),
                        "HmacSHA512"
                )
        );

        fields.put(
                "vnp_SecureHash",
                HexFormat.of().formatHex(
                        mac.doFinal(data.getBytes(StandardCharsets.UTF_8))
                )
        );

        return fields;
    }

    BookingResponse prepared() {
        BookingResponse booking = create(
                List.of(f.seatIds().getFirst())
        );

        bookings.preparePayment(booking.getId(), f.email());
        return booking;
    }

    String amount(BookingResponse booking) {
        return booking.getTotalAmount()
                .movePointRight(2)
                .toBigIntegerExact()
                .toString();
    }

    @Test
    void serverPricesSeatsAndPreservesSelectionAcrossReload() {
        BookingResponse booking = create(f.seatIds());

        assertThat(booking.getTotalAmount())
                .isEqualByComparingTo("340000.00");

        assertThat(booking.getHoldExpiresAt())
                .isAfter(java.time.OffsetDateTime.now().plusMinutes(9))
                .isBefore(java.time.OffsetDateTime.now().plusMinutes(11));

        BookingResponse loaded =
                bookings.getBookingById(booking.getId(), f.email());

        assertThat(loaded.getSeatIds())
                .containsExactlyElementsOf(f.seatIds());

        assertThat(loaded.getSeats())
                .allSatisfy(s -> assertThat(s.getTicketCode()).isNull());

        assertThat(
                layouts.getSeatLayoutByShowtimeId(f.showtimeId())
                        .getAvailableSeats()
        ).isZero();

        assertThat(
                loaded.getSeats().stream()
                        .map(BookingSeatResponse::getPrice)
                        .toList()
        ).containsExactlyInAnyOrder(
                new BigDecimal("80000.00"),
                new BigDecimal("100000.00"),
                new BigDecimal("160000.00")
        );
    }

    @Test
    void rejectsDuplicateForeignAndEmptySeats() {
        assertThatThrownBy(() -> create(
                List.of(
                        f.seatIds().getFirst(),
                        f.seatIds().getFirst()
                )
        )).isInstanceOf(BadRequestException.class);

        assertThatThrownBy(() ->
                create(List.of(f.foreignSeatId()))
        ).isInstanceOf(BadRequestException.class);

        assertThatThrownBy(() ->
                create(List.of())
        ).isInstanceOf(BadRequestException.class);
    }

    @Test
    void ownershipProtectsReadCancelAndPayment() {
        BookingResponse booking =
                create(List.of(f.seatIds().getFirst()));

        assertThatThrownBy(() ->
                bookings.getBookingById(
                        booking.getId(),
                        f.otherEmail()
                )
        ).isInstanceOf(AccessDeniedException.class);

        assertThatThrownBy(() ->
                bookings.cancelBooking(
                        booking.getId(),
                        f.otherEmail()
                )
        ).isInstanceOf(AccessDeniedException.class);

        assertThatThrownBy(() ->
                bookings.preparePayment(
                        booking.getId(),
                        f.otherEmail()
                )
        ).isInstanceOf(AccessDeniedException.class);

        assertThat(bookings.getMyBookings(f.otherEmail())).isEmpty();
    }

    @Test
    void cancelReleasesSeatsAndOldBookingCannotReleaseNewHold() {
        BookingResponse old =
                create(List.of(f.seatIds().getFirst()));

        assertThat(
                bookings.cancelBooking(old.getId(), f.email())
                        .getStatus()
        ).isEqualTo("CANCELLED");

        BookingResponse next =
                create(List.of(f.seatIds().getFirst()));

        bookings.cancelBooking(old.getId(), f.email());

        assertThat(
                bookings.getBookingById(next.getId(), f.email())
                        .getStatus()
        ).isEqualTo("PENDING");

        assertThat(
                layouts.getSeatLayoutByShowtimeId(f.showtimeId())
                        .getAvailableSeats()
        ).isEqualTo(2);
    }

    @Test
    void expiryReleasesSeatsAndRejectsLatePayment() throws Exception {
        BookingResponse booking = prepared();

        tx.executeWithoutResult(status -> {
            Booking entity = bookingRepository
                    .findById(booking.getId())
                    .orElseThrow();

            LocalDateTime past =
                    LocalDateTime.now().minusSeconds(10);

            entity.setHoldExpiresAt(past);

            showtimeSeats.findByShowtimeIdWithDetails(f.showtimeId())
                    .stream()
                    .filter(s -> s.getSeat().getId()
                            .equals(f.seatIds().getFirst()))
                    .forEach(s -> s.setHoldExpiresAt(past));
        });

        assertThat(
                vnpay.ipn(callback(booking, amount(booking), "00"))
                        .get("RspCode")
        ).isEqualTo("00");

        BookingResponse expired =
                bookings.getBookingById(booking.getId(), f.email());

        assertThat(expired.getStatus()).isEqualTo("EXPIRED");
        assertThat(expired.isPaymentReviewRequired()).isTrue();

        assertThat(expired.getSeats())
                .allSatisfy(s -> assertThat(s.getTicketCode()).isNull());

        assertThat(
                layouts.getSeatLayoutByShowtimeId(f.showtimeId())
                        .getAvailableSeats()
        ).isEqualTo(3);
    }

    @Test
    void invalidSignatureAndWrongAmountCannotIssueTickets()
            throws Exception {
        BookingResponse booking = prepared();

        Map<String, String> tampered =
                callback(booking, amount(booking), "00");
        tampered.put("vnp_Amount", "1");

        assertThat(vnpay.ipn(tampered).get("RspCode"))
                .isEqualTo("97");

        assertThat(
                vnpay.ipn(callback(booking, "1", "00"))
                        .get("RspCode")
        ).isEqualTo("04");

        assertThat(
                bookings.getBookingById(booking.getId(), f.email())
                        .getStatus()
        ).isEqualTo("PENDING");
    }

    @Test
    void ipnIssuesTicketsExactlyOnceAndLocksSoldSeats()
            throws Exception {
        BookingResponse booking = prepared();

        Map<String, String> params =
                callback(booking, amount(booking), "00");

        assertThat(vnpay.ipn(params).get("RspCode"))
                .isEqualTo("00");

        assertThat(vnpay.ipn(params).get("RspCode"))
                .isEqualTo("02");

        BookingResponse paid =
                bookings.getBookingById(booking.getId(), f.email());

        assertThat(paid.getStatus()).isEqualTo("PAID");

        assertThat(paid.getSeats()).allSatisfy(
                s -> assertThat(s.getTicketCode()).startsWith("TK-")
        );

        assertThat(tickets.findByBookingIdOrderById(booking.getId()))
                .hasSize(1);

        assertThat(
                payments.findByBookingId(booking.getId())
                        .orElseThrow()
                        .getPaymentStatus()
        ).isEqualTo(PaymentStatus.SUCCESS);

        assertThatThrownBy(() ->
                create(List.of(f.seatIds().getFirst()))
        ).isInstanceOf(BadRequestException.class);

        assertThatThrownBy(() ->
                bookings.cancelBooking(booking.getId(), f.email())
        ).isInstanceOf(BadRequestException.class);
    }

    @Test
    void failedPaymentCancelsBookingAndReleasesSeats()
            throws Exception {
        BookingResponse booking = prepared();

        assertThat(
                vnpay.ipn(callback(booking, amount(booking), "24"))
                        .get("RspCode")
        ).isEqualTo("00");

        assertThat(
                bookings.getBookingById(booking.getId(), f.email())
                        .getStatus()
        ).isEqualTo("CANCELLED");

        assertThat(
                layouts.getSeatLayoutByShowtimeId(f.showtimeId())
                        .getAvailableSeats()
        ).isEqualTo(3);
    }

    @Test
    void paymentUrlUsesStoredAmountAndServerExpiry()
            throws Exception {
        BookingResponse booking =
                create(List.of(f.seatIds().getFirst()));

        String url = vnpay.paymentUrl(
                booking.getId(),
                f.email(),
                "127.0.0.1"
        ).get("paymentUrl");

        Map<String, String> params = new HashMap<>();

        for (String pair : URI.create(url).getRawQuery().split("&")) {
            String[] parts = pair.split("=", 2);

            params.put(
                    URLDecoder.decode(parts[0], StandardCharsets.UTF_8),
                    URLDecoder.decode(parts[1], StandardCharsets.UTF_8)
            );
        }

        assertThat(params.get("vnp_Amount"))
                .isEqualTo(amount(booking));

        assertThat(params.get("vnp_ReturnUrl"))
                .isEqualTo(
                        "https://example.test/api/v1/payments/vnpay/return"
                );

        assertThat(vnpay.verifiedBookingId(params))
                .isEqualTo(booking.getId());
    }

    @Test
    void browserReturnDoesNotSettlePayment() throws Exception {
        BookingResponse booking = prepared();

        var request = get("/api/v1/payments/vnpay/return");
        callback(booking, amount(booking), "00")
                .forEach(request::param);

        mvc.perform(request)
                .andExpect(status().isSeeOther())
                .andExpect(header().string(
                        "Location",
                        "https://example.test/checkout/"
                                + booking.getId()
                                + "?vnpay=returned"
                ));

        assertThat(
                bookings.getBookingById(booking.getId(), f.email())
                        .getStatus()
        ).isEqualTo("PENDING");
    }

    @Test
    void bookingRequiresAuthenticationAndValidRequest()
            throws Exception {
        String payload =
                "{\"showtimeId\":" + f.showtimeId()
                        + ",\"seatIds\":["
                        + f.seatIds().getFirst() + "]}";

        mvc.perform(
                post("/api/v1/bookings")
                        .contentType("application/json")
                        .content(payload)
        ).andExpect(status().isForbidden());

        String token = jwt.generateTokenFromUsername(f.email());

        mvc.perform(
                post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(
                                "{\"showtimeId\":" + f.showtimeId()
                                        + ",\"seatIds\":[]}"
                        )
        ).andExpect(status().isBadRequest());

        mvc.perform(
                post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(payload)
        )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"));

        mvc.perform(
                patch(
                        "/api/v1/showtimes/"
                                + f.showtimeId()
                                + "/seats/status"
                )
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(
                                "{\"showtimeSeatIds\":[1],"
                                        + "\"status\":\"BOOKED\"}"
                        )
        ).andExpect(status().isBadRequest());
    }

    @Test
    void simultaneousRequestsCannotHoldTheSameSeat()
            throws Exception {
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);

        try {
            Callable<Boolean> attempt = () -> {
                start.await();

                try {
                    create(List.of(f.seatIds().getFirst()));
                    return true;
                } catch (BadRequestException ex) {
                    return false;
                }
            };

            Future<Boolean> one = pool.submit(attempt);
            Future<Boolean> two = pool.submit(attempt);

            start.countDown();

            assertThat(
                    List.of(
                            one.get(15, TimeUnit.SECONDS),
                            two.get(15, TimeUnit.SECONDS)
                    )
            ).containsExactlyInAnyOrder(true, false);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void missingMerchantConfigurationReturnsActionableErrorWithoutCreatingPayment()
            throws Exception {
        BookingResponse booking =
                create(List.of(f.seatIds().getFirst()));

        Object original =
                org.springframework.test.util.ReflectionTestUtils
                        .getField(vnpay, "hashSecret");

        try {
            org.springframework.test.util.ReflectionTestUtils
                    .setField(vnpay, "hashSecret", "");

            mvc.perform(
                    post(
                            "/api/v1/payments/vnpay/"
                                    + booking.getId()
                                    + "/url"
                    ).header(
                            "Authorization",
                            "Bearer "
                                    + jwt.generateTokenFromUsername(f.email())
                    )
            )
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.message").value(
                            org.hamcrest.Matchers.containsString(
                                    "VNPAY_HASH_SECRET"
                            )
                    ));

            assertThat(
                    payments.findByBookingId(booking.getId())
            ).isEmpty();
        } finally {
            org.springframework.test.util.ReflectionTestUtils
                    .setField(vnpay, "hashSecret", original);
        }
    }

    @Test
    void expiredBookingCannotTakeSeatsFromNewOwnerWhenIpnArrivesLate()
            throws Exception {
        BookingResponse old = prepared();

        tx.executeWithoutResult(status -> {
            Booking booking = bookingRepository
                    .findById(old.getId())
                    .orElseThrow();

            LocalDateTime past =
                    LocalDateTime.now().minusMinutes(1);

            booking.setHoldExpiresAt(past);

            showtimeSeats.findByShowtimeIdWithDetails(f.showtimeId())
                    .stream()
                    .filter(s -> s.getSeat().getId()
                            .equals(f.seatIds().getFirst()))
                    .forEach(s -> s.setHoldExpiresAt(past));
        });

        bookings.expirePendingBookings();

        BookingResponse next = bookings.createBooking(
                request(List.of(f.seatIds().getFirst())),
                f.otherEmail()
        );

        assertThat(
                vnpay.ipn(callback(old, amount(old), "00"))
                        .get("RspCode")
        ).isEqualTo("00");

        assertThat(
                bookings.getBookingById(next.getId(), f.otherEmail())
                        .getStatus()
        ).isEqualTo("PENDING");

        assertThat(
                bookings.getBookingById(old.getId(), f.email())
                        .isPaymentReviewRequired()
        ).isTrue();

        assertThat(
                layouts.getSeatLayoutByShowtimeId(f.showtimeId())
                        .getAvailableSeats()
        ).isEqualTo(2);
    }

    @Test
    void simultaneousIpnCallbacksIssueOnePaymentAndOneTicket()
            throws Exception {
        BookingResponse booking = prepared();

        Map<String, String> params =
                callback(booking, amount(booking), "00");

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);

        try {
            Callable<String> callback = () -> {
                start.await();
                return vnpay.ipn(params).get("RspCode");
            };

            Future<String> one = pool.submit(callback);
            Future<String> two = pool.submit(callback);

            start.countDown();

            assertThat(
                    List.of(
                            one.get(15, TimeUnit.SECONDS),
                            two.get(15, TimeUnit.SECONDS)
                    )
            ).containsExactlyInAnyOrder("00", "02");

            assertThat(
                    tickets.findByBookingIdOrderById(booking.getId())
            ).hasSize(1);

            assertThat(
                    bookings.getBookingById(booking.getId(), f.email())
                            .getStatus()
            ).isEqualTo("PAID");
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void signedIpnWorksWithoutBrowserAuthentication()
            throws Exception {
        BookingResponse booking = prepared();

        var request = get("/api/v1/payments/vnpay/ipn");

        callback(booking, amount(booking), "00")
                .forEach(request::param);

        mvc.perform(request)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.RspCode").value("00"));

        assertThat(
                bookings.getBookingById(booking.getId(), f.email())
                        .getStatus()
        ).isEqualTo("PAID");
    }

    @Test
    void seatLayoutReadDoesNotPersistExpiryChanges() {
        BookingResponse booking =
                create(List.of(f.seatIds().getFirst()));

        tx.executeWithoutResult(status -> {
            LocalDateTime past =
                    LocalDateTime.now().minusSeconds(10);

            bookingRepository.findById(booking.getId())
                    .orElseThrow()
                    .setHoldExpiresAt(past);

            showtimeSeats.findByShowtimeIdWithDetails(f.showtimeId())
                    .stream()
                    .filter(s -> s.getSeat().getId()
                            .equals(f.seatIds().getFirst()))
                    .forEach(s -> s.setHoldExpiresAt(past));
        });

        // MySQL hết hạn nhưng khóa Redis vẫn còn: ghế vẫn đang HELD.
        // Đọc sơ đồ không tự cập nhật trạng thái lưu trong MySQL.
        assertThat(
                layouts.getSeatLayoutByShowtimeId(f.showtimeId())
                        .getAvailableSeats()
        ).isEqualTo(2);

        tx.executeWithoutResult(status ->
                assertThat(
                        showtimeSeats
                                .findByShowtimeIdWithDetails(f.showtimeId())
                                .stream()
                                .filter(s -> s.getSeat().getId()
                                        .equals(f.seatIds().getFirst()))
                                .findFirst()
                                .orElseThrow()
                                .getStatus()
                ).isEqualTo(SeatStatus.HELD)
        );
    }
}