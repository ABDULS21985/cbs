package com.cbs.common.audit;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.AuditorAware;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CurrentActorProvider {

    private final AuditorAware<String> auditorAware;

    public String getCurrentActor() {
        return auditorAware.getCurrentAuditor().orElse("SYSTEM");
    }
}
