package com.cbs.notification.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RenderIslamicNotificationRequest {
    private String locale;
    @NotNull
    private Map<String, Object> variables;
    private String context;
}
