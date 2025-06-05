package com.chiennc.identity.configuration;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;


/// Sử dụng token gán vào header rồi gửi sang
/// feign client sẽ inject class này vào để lấy header token
@Slf4j
public class AuthenticationRequestInterceptor implements RequestInterceptor {
    @Override
    public void apply(RequestTemplate template) {
        ServletRequestAttributes servletRequestAttributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();

        assert servletRequestAttributes != null;
        var authHeader = servletRequestAttributes.getRequest().getHeader("Authorization");

        log.info("Header: {}", authHeader);
        if (StringUtils.hasText(authHeader))
            template.header("Authorization", authHeader);
    }
}
