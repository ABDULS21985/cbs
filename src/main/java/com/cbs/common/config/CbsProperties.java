package com.cbs.common.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "cbs")
@Getter
@Setter
public class CbsProperties {

    private Pagination pagination = new Pagination();
    private Security security = new Security();

    @Getter
    @Setter
    public static class Pagination {
        private int defaultPageSize = 20;
        private int maxPageSize = 100;
    }

    @Getter
    @Setter
    public static class Security {
        private Cors cors = new Cors();

        @Getter
        @Setter
        public static class Cors {
            private String allowedOrigins = "http://localhost:3000";
        }
    }
}
