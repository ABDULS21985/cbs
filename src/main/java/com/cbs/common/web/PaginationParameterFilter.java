package com.cbs.common.web;

import com.cbs.common.config.CbsProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class PaginationParameterFilter extends OncePerRequestFilter {

    private final CbsProperties cbsProperties;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Map<String, String[]> parameters = new LinkedHashMap<>(request.getParameterMap());
        boolean changed = false;

        if (parameters.containsKey("page")) {
            changed |= normalizePage(parameters);
        }
        if (parameters.containsKey("size")) {
            changed |= normalizeSize(parameters);
        }

        if (!changed) {
            filterChain.doFilter(request, response);
            return;
        }

        filterChain.doFilter(new SanitizedPaginationRequest(request, parameters), response);
    }

    private boolean normalizePage(Map<String, String[]> parameters) {
        try {
            int page = Integer.parseInt(firstValue(parameters.get("page")));
            int sanitized = Math.max(page, 0);
            if (sanitized == page) {
                return false;
            }
            parameters.put("page", new String[]{String.valueOf(sanitized)});
            return true;
        } catch (NumberFormatException ex) {
            parameters.put("page", new String[]{"0"});
            return true;
        }
    }

    private boolean normalizeSize(Map<String, String[]> parameters) {
        int defaultPageSize = cbsProperties.getPagination().getDefaultPageSize();
        int maxPageSize = cbsProperties.getPagination().getMaxPageSize();
        try {
            int size = Integer.parseInt(firstValue(parameters.get("size")));
            int sanitized = size <= 0 ? defaultPageSize : Math.min(size, maxPageSize);
            if (sanitized == size) {
                return false;
            }
            parameters.put("size", new String[]{String.valueOf(sanitized)});
            return true;
        } catch (NumberFormatException ex) {
            parameters.put("size", new String[]{String.valueOf(defaultPageSize)});
            return true;
        }
    }

    private String firstValue(String[] values) {
        return values != null && values.length > 0 ? values[0] : "";
    }

    private static final class SanitizedPaginationRequest extends HttpServletRequestWrapper {

        private final Map<String, String[]> parameters;

        private SanitizedPaginationRequest(HttpServletRequest request, Map<String, String[]> parameters) {
            super(request);
            this.parameters = parameters;
        }

        @Override
        public String getParameter(String name) {
            String[] values = parameters.get(name);
            return values != null && values.length > 0 ? values[0] : super.getParameter(name);
        }

        @Override
        public Map<String, String[]> getParameterMap() {
            return parameters;
        }

        @Override
        public String[] getParameterValues(String name) {
            return parameters.getOrDefault(name, super.getParameterValues(name));
        }
    }
}
