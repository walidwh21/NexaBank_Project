package com.nexabank.api.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "nexabank.security")
public record SecurityProperties(
        String jwtSecret,
        long tokenTtlMinutes,
        String adminPassword,
        String tellerPassword,
        List<String> allowedOrigins) {
}
