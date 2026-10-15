package com.example.demo.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration authConfig
    ) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http
    ) throws Exception {
        http
                // Tắt CSRF và bật CORS.
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())

                // Xác thực bằng JWT, không lưu session.
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                .authorizeHttpRequests(auth -> auth
                        // Cho phép preflight.
                        .requestMatchers(
                                HttpMethod.OPTIONS,
                                "/**"
                        ).permitAll()

                        // API đăng nhập, đăng ký, xác minh email.
                        .requestMatchers(
                                "/api/v1/auth/**"
                        ).permitAll()

                        // Booking yêu cầu đăng nhập.
                        .requestMatchers(
                                "/api/v1/bookings/**"
                        ).authenticated()

                        // VNPay gọi callback không có JWT.
                        // VnpayService kiểm tra chữ ký.
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/v1/payments/vnpay/ipn",
                                "/api/v1/payments/vnpay/return"
                        ).permitAll()

                        // Các API thanh toán còn lại yêu cầu đăng nhập.
                        .requestMatchers(
                                "/api/v1/payments/**"
                        ).authenticated()

                        // Phải đặt trước matcher showtimes/** bên dưới.
                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/v1/showtimes/*/seats/status"
                        ).authenticated()

                        // Giữ nguyên các quy tắc module khác.
                        .requestMatchers(
                                "/ws-cinema/**"
                        ).permitAll()

                        .requestMatchers(
                                "/api/cinemas/**"
                        ).permitAll()

                        .requestMatchers(
                                "/api/cities/**"
                        ).permitAll()

                        .requestMatchers(
                                "/api/halls/**"
                        ).permitAll()

                        .requestMatchers(
                                "/api/seats/**"
                        ).permitAll()

                        .requestMatchers(
                                "/api/v1/movies/**"
                        ).permitAll()

                        .requestMatchers(
                                "/api/v1/genres/**"
                        ).permitAll()

                        .requestMatchers(
                                "/api/v1/showtimes/**"
                        ).permitAll()

                        .requestMatchers(
                                "/api/v1/users/**"
                        ).authenticated()

                        .requestMatchers(
                                "/api/v1/notifications/**"
                        ).authenticated()

                        .requestMatchers(
                                "/api/v1/roles/**"
                        ).permitAll()

                        .anyRequest().authenticated()
                );

        http.addFilterBefore(
                jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class
        );

        return http.build();
    }
}