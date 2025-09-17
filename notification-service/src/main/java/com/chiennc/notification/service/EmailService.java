package com.chiennc.notification.service;

import com.chiennc.notification.dto.request.EmailRequest;
import com.chiennc.notification.dto.request.SendEmailRequest;
import com.chiennc.notification.dto.request.Sender;
import com.chiennc.notification.dto.response.EmailResponse;
import com.chiennc.notification.exception.AppException;
import com.chiennc.notification.exception.ErrorCode;
import com.chiennc.notification.repository.httpclient.EmailClient;
import feign.FeignException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class EmailService {
    EmailClient emailClient;

    String apiKey = "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";

    public EmailResponse sendEmail(SendEmailRequest request) {
        EmailRequest emailRequest = EmailRequest.builder()
                .sender(Sender.builder()
                        .name("Chien Dev")
                        .email("chiennc09@gmail.com")
                        .build())
                .to(List.of(request.getTo()))
                .subject(request.getSubject())
                .htmlContent(request.getHtmlContent())
                .build();
        try {
            return emailClient.sendEmail(apiKey, emailRequest);
        } catch (FeignException e){
            throw new AppException(ErrorCode.CANNOT_SEND_EMAIL);
        }
    }
}
