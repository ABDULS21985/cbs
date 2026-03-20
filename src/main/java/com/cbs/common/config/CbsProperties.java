package com.cbs.common.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

/**
 * Global deployment configuration. Every country/region-specific setting
 * lives here — zero hardcoded locale references anywhere else in the codebase.
 * Operators configure this per deployment via application.yml or environment variables.
 */
@Configuration
@ConfigurationProperties(prefix = "cbs")
@Getter
@Setter
public class CbsProperties {

    private Deployment deployment = new Deployment();
    private Pagination pagination = new Pagination();
    private Security security = new Security();
    private AccountConfig account = new AccountConfig();
    private InterestConfig interest = new InterestConfig();
    private LedgerConfig ledger = new LedgerConfig();
    private KycConfig kyc = new KycConfig();
    private LifecycleConfig lifecycle = new LifecycleConfig();
    private Simulation simulation = new Simulation();

    @Getter @Setter
    public static class Deployment {
        /** ISO 3166-1 alpha-3 country code */
        private String countryCode = "GLOBAL";
        /** Default currency ISO 4217 */
        private String defaultCurrency = "USD";
        /** Default timezone for batch jobs */
        private String timezone = "UTC";
        /** Default locale for formatting */
        private String locale = "en";
        /** Institution name */
        private String institutionName = "Core Banking";
        /** Institution code (SWIFT BIC, national bank code) */
        private String institutionCode = "";
        /** Regulatory body name */
        private String regulatoryBody = "";
        /** Multi-tenant mode */
        private boolean multiTenant = false;
    }

    @Getter @Setter
    public static class Pagination {
        private int defaultPageSize = 20;
        private int maxPageSize = 100;
    }

    @Getter @Setter
    public static class Security {
        private Cors cors = new Cors();
        private Jwt jwt = new Jwt();
        private List<String> publicPaths = new ArrayList<>();
        @Getter @Setter
        public static class Cors {
            private String allowedOrigins = "";
        }
        @Getter @Setter
        public static class Jwt {
            /**
             * Comma-separated audiences or client IDs that this API accepts.
             * For Keycloak public clients, azp is validated against the same set.
             */
            private String acceptedAudiences = "cbs-app";
        }
    }

    @Getter @Setter
    public static class AccountConfig {
        /** SEQUENTIAL, IBAN, NUBAN, BBAN, CUSTOM */
        private String numberingScheme = "SEQUENTIAL";
        private String numberPrefix = "";
        private int numberLength = 10;
        private String ibanCountryCode = "";
        private String ibanBankCode = "";
        private String cifPrefix = "CIF";
        private int cifLength = 10;
        private String txnRefPrefix = "TXN";
    }

    @Getter @Setter
    public static class InterestConfig {
        /** ACT_365, ACT_360, ACT_ACT, THIRTY_360 */
        private String dayCountConvention = "ACT_365";
        private int calculationScale = 4;
        private int postingScale = 2;
        private boolean accrueOnWeekends = true;
        private boolean accrueOnHolidays = true;
    }

    @Getter @Setter
    public static class LedgerConfig {
        /** Default branch/cost center for GL lines when no branch is supplied by the source module. */
        private String defaultBranchCode = "HEAD";
        /** Contra GL for opening balance cash/till funding when a new account is opened with an initial deposit. */
        private String openingBalanceContraGlCode = "";
        /** Clearing GL for domestic/outbound payments that leave the bank. */
        private String externalClearingGlCode = "";
        /** Control GL for fixed deposit liabilities. */
        private String fixedDepositControlGlCode = "";
        /** Control GL for recurring deposit liabilities. */
        private String recurringDepositControlGlCode = "";
    }

    @Getter @Setter
    public static class KycConfig {
        /** INTERNAL, ONFIDO, JUMIO, SUMSUB, or deployment-specific providers */
        private String provider = "";
        private String providerBaseUrl = "";
        private int providerTimeoutSeconds = 30;
        private List<IdTypeConfig> idTypes = new ArrayList<>();
        private boolean requireVerifiedId = false;

        @Getter @Setter
        public static class IdTypeConfig {
            private String code;
            private String name;
            private String country;
            private String validationRegex;
            private boolean verifiable;
        }
    }

    @Getter @Setter
    public static class LifecycleConfig {
        private int defaultDormancyDays = 365;
        private int escheatmentYears = 6;
        private String interestAccrualCron = "0 30 23 * * *";
        private String dormancyDetectionCron = "0 0 0 * * *";
        private String escheatmentDetectionCron = "0 0 1 1 * *";
    }

    @Getter @Setter
    public static class Simulation {
        /**
         * Allows endpoints backed by synthetic calculations, seeded demo data,
         * or stubbed third-party integrations.
         */
        private boolean allowSyntheticServices = false;

        /**
         * Allows the INTERNAL KYC provider, which only validates configured formats
         * and must never be treated as a production verification source.
         */
        private boolean allowInternalKyc = false;
    }
}
