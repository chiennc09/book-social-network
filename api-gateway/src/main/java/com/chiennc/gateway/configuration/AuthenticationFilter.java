package com.chiennc.gateway.configuration;

import com.chiennc.gateway.dto.ApiResponse;
import com.chiennc.gateway.service.IdentityService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PACKAGE, makeFinal = true)
public class AuthenticationFilter implements GlobalFilter, Ordered {

    IdentityService identityService;
    ObjectMapper objectMapper;

    /**
     * Public endpoints that bypass JWT verification.
     *
     * Rules (regex matched against full request path):
     *  - /identity/auth/**        — login, register, introspect, refresh, logout
     *  - /identity/users/registration
     *  - /notification/email/send — webhook / external sender, no auth needed
     *  - /file/media/download/**  — public file download by URL
     *  - /chat/ws/**              — WebSocket STOMP upgrade (auth handled inside STOMP CONNECT frame)
     *  - /recommendation/**       — recommendation reads are public (personalised but not protected)
     */
    @NonFinal
    private String[] publicEndpoints = {
            "/identity/auth/.*",
            "/identity/users/registration",
            "/notification/email/send",
            "/file/media/download/.*",
            "/chat/ws/.*",
            "/recommendation/.*",
    };

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {

        if (isPublicEndpoint(exchange.getRequest()))
            return chain.filter(exchange);

        // Get token from Authorization header
        List<String> authHeader = exchange.getRequest().getHeaders().get(HttpHeaders.AUTHORIZATION);
        if (CollectionUtils.isEmpty(authHeader))
            return unauthenticated(exchange.getResponse());

        // Strip 'Bearer ' prefix
        String token = authHeader.getFirst().replace("Bearer ", "");

        // Verify token via identity-service introspect
        return identityService.introspect(token).flatMap(introspectResponse -> {
            if (introspectResponse.getResult().isValid())
                return chain.filter(exchange);
            else
                return unauthenticated(exchange.getResponse());
        }).onErrorResume(throwable -> unauthenticated(exchange.getResponse()));
    }

    @Override
    public int getOrder() {
        return -1;
    }

    private boolean isPublicEndpoint(ServerHttpRequest request) {
        return Arrays.stream(publicEndpoints)
                .anyMatch(s -> request.getURI().getPath().matches(s));
    }

    Mono<Void> unauthenticated(ServerHttpResponse response) {
        ApiResponse<?> apiResponse = ApiResponse.builder()
                .code(1401)
                .message("Unauthenticated")
                .build();

        String body;
        try {
            body = objectMapper.writeValueAsString(apiResponse);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }

        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().add(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);

        return response.writeWith(
                Mono.just(response.bufferFactory().wrap(body.getBytes())));
    }
}
