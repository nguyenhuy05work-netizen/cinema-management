package com.example.demo.module.booking.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

@Service
@Slf4j
public class RedisSeatHoldService {

    private final StringRedisTemplate redis;
    private final String prefix;

    // Kiểm tra toàn bộ ghế trước khi khóa bất kỳ ghế nào.
    private static final DefaultRedisScript<Long> ACQUIRE =
            new DefaultRedisScript<>("""
                    for i, key in ipairs(KEYS) do
                        if redis.call('EXISTS', key) == 1 then
                            return 0
                        end
                    end

                    for i, key in ipairs(KEYS) do
                        redis.call('PSETEX', key, ARGV[2], ARGV[1])
                    end

                    return 1
                    """, Long.class);

    // Tất cả khóa phải thuộc đúng booking.
    private static final DefaultRedisScript<Long> OWNED =
            new DefaultRedisScript<>("""
                    for i, key in ipairs(KEYS) do
                        if redis.call('GET', key) ~= ARGV[1] then
                            return 0
                        end
                    end

                    return 1
                    """, Long.class);

    // Chỉ xóa khóa thuộc booking yêu cầu nhả ghế.
    private static final DefaultRedisScript<Long> RELEASE =
            new DefaultRedisScript<>("""
                    local count = 0

                    for i, key in ipairs(KEYS) do
                        if redis.call('GET', key) == ARGV[1] then
                            count = count + redis.call('DEL', key)
                        end
                    end

                    return count
                    """, Long.class);

    public RedisSeatHoldService(
            StringRedisTemplate redis,
            @Value("${app.booking.redis-key-prefix:cinema:hold:}")
            String prefix
    ) {
        this.redis = redis;
        this.prefix = prefix;
    }

    private List<String> keys(
            Long showtimeId,
            List<Long> seatIds
    ) {
        // Các khóa của cùng suất chiếu nằm cùng Redis Cluster hash slot.
        // Namespace riêng để không ghi đè khóa của bản cũ.
        return seatIds.stream()
                .map(id ->
                        prefix + "{" + showtimeId + "}:seat:" + id
                )
                .toList();
    }

    public boolean acquire(
            Long showtimeId,
            List<Long> seatIds,
            Long bookingId,
            Duration ttl
    ) {
        requireTransaction();

        if (seatIds.isEmpty() || ttl.isNegative() || ttl.isZero()) {
            return false;
        }

        List<String> keys = keys(showtimeId, seatIds);

        // Nếu SQL rollback, dọn khóa thuộc booking mới.
        // Đăng ký trước để xử lý cả trường hợp Redis trả lời bị timeout.
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCompletion(int status) {
                        if (status != STATUS_COMMITTED) {
                            safeRelease(keys, bookingId);
                        }
                    }
                }
        );

        try {
            Long result = redis.execute(
                    ACQUIRE,
                    keys,
                    bookingId.toString(),
                    Long.toString(Math.max(1, ttl.toMillis()))
            );

            return Long.valueOf(1).equals(result);
        } catch (org.springframework.dao.DataAccessException ex) {
            throw unavailable();
        }
    }

    public boolean ownsAll(
            Long showtimeId,
            List<Long> seatIds,
            Long bookingId
    ) {
        if (seatIds.isEmpty()) {
            return false;
        }

        try {
            Long result = redis.execute(
                    OWNED,
                    keys(showtimeId, seatIds),
                    bookingId.toString()
            );

            return Long.valueOf(1).equals(result);
        } catch (org.springframework.dao.DataAccessException ex) {
            throw unavailable();
        }
    }

    public List<String> owners(
            Long showtimeId,
            List<Long> seatIds
    ) {
        if (seatIds.isEmpty()) {
            return List.of();
        }

        try {
            List<String> values = redis.opsForValue()
                    .multiGet(keys(showtimeId, seatIds));

            if (values == null) {
                throw unavailable();
            }

            return Collections.unmodifiableList(values);
        } catch (org.springframework.dao.DataAccessException ex) {
            throw unavailable();
        }
    }

    public void releaseAfterCommit(
            Long showtimeId,
            List<Long> seatIds,
            Long bookingId
    ) {
        requireTransaction();

        List<String> keys = keys(showtimeId, seatIds);

        // Chỉ nhả khóa sau khi hủy/thanh toán đã lưu thành công.
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        safeRelease(keys, bookingId);
                    }
                }
        );
    }

    private void safeRelease(
            List<String> keys,
            Long bookingId
    ) {
        if (keys.isEmpty()) {
            return;
        }

        try {
            redis.execute(
                    RELEASE,
                    keys,
                    bookingId.toString()
            );
        } catch (RuntimeException ex) {
            // SQL có thể đã commit; không báo rằng transaction rollback.
            // Nếu Redis chưa dọn được, khóa sẽ tự hết TTL.
            log.warn(
                    "Cannot clean Redis hold for booking {}. "
                            + "TTL will release it.",
                    bookingId
            );
        }
    }

    private void requireTransaction() {
        if (!TransactionSynchronizationManager
                .isActualTransactionActive()) {
            throw new IllegalStateException(
                    "Redis booking mutations require a database transaction."
            );
        }
    }

    private ResponseStatusException unavailable() {
        return new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Không thể kết nối Redis. "
                        + "Chưa thể giữ ghế hoặc xác nhận thanh toán."
        );
    }
}