package com.chiennc.gateway.repository;

import com.chiennc.gateway.dto.ApiResponse;
import com.chiennc.gateway.dto.request.IntrospectRequest;
import com.chiennc.gateway.dto.response.IntrospectResponse;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.service.annotation.PostExchange;
import reactor.core.publisher.Mono;
/// Spring 6
/// sử dụng Http interface Client ~ Feign Client

public interface IdentityClient {
    @PostExchange(url = "/auth/introspect", contentType = MediaType.APPLICATION_JSON_VALUE)
    Mono<ApiResponse<IntrospectResponse>> introspect(@RequestBody IntrospectRequest request);
}
