
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
            .csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults())

            .sessionManagement(session ->
                session.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS
                )
            )

            .authorizeHttpRequests(auth -> auth

                // CORS preflight
                .requestMatchers(
                    HttpMethod.OPTIONS, "/**"
                ).permitAll()

                // Authentication
                .requestMatchers(
                    "/api/v1/auth/**",
                    "/api/auth/**"
                ).permitAll()

                // VNPay callback: không yêu cầu JWT
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/v1/payments/vnpay/ipn",
                    "/api/v1/payments/vnpay/return"
                ).permitAll()

                // Booking: yêu cầu đăng nhập
                // Quyền chi tiết kiểm tra ở Controller
                .requestMatchers(
                    "/api/v1/bookings/**"
                ).authenticated()

                // Payment: yêu cầu đăng nhập
                .requestMatchers(
                    "/api/v1/payments/**"
                ).authenticated()

                // Thay đổi trạng thái ghế
                .requestMatchers(
                    HttpMethod.PATCH,
                    "/api/v1/showtimes/*/seats/status"
                ).authenticated()

                // WebSocket
                .requestMatchers(
                    "/ws-cinema/**"
                ).permitAll()

                // Cinema
                .requestMatchers(
                    "/api/cinemas/**",
                    "/api/cities/**",
                    "/api/halls/**",
                    "/api/seats/**"
                ).permitAll()

                // Movies, genres, showtimes
                .requestMatchers(
                    "/api/v1/movies/**",
                    "/api/v1/genres/**",
                    "/api/v1/showtimes/**"
                ).permitAll()

                // Review management
                .requestMatchers(
                    "/api/v1/reviews/admin/**"
                ).hasRole("ADMIN")

                .requestMatchers(
                    "/api/v1/reviews/**"
                ).permitAll()

                // User, notifications
                .requestMatchers(
                    "/api/v1/users/**",
                    "/api/v1/notifications/**"
                ).authenticated()

                // Role & Permission management
                .requestMatchers(
                    "/api/v1/roles/**",
                    "/api/v1/permissions/**"
                ).hasRole("ADMIN")

                // API còn lại
                .anyRequest().authenticated()
            );

        http.addFilterBefore(
            jwtAuthenticationFilter,
            UsernamePasswordAuthenticationFilter.class
        );

        return http.build();
    }
}
