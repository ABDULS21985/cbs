package com.cbs.common.web;

import com.cbs.common.config.CbsProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CbsPageRequestFactory {

    private final CbsProperties cbsProperties;

    public Pageable create(int page, int size) {
        return PageRequest.of(sanitizePage(page), sanitizeSize(size));
    }

    public Pageable create(int page, int size, Sort sort) {
        return PageRequest.of(sanitizePage(page), sanitizeSize(size), sort);
    }

    private int sanitizePage(int page) {
        return Math.max(page, 0);
    }

    private int sanitizeSize(int size) {
        if (size <= 0) {
            return cbsProperties.getPagination().getDefaultPageSize();
        }
        return Math.min(size, cbsProperties.getPagination().getMaxPageSize());
    }
}
