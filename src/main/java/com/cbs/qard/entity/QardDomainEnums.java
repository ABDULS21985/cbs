package com.cbs.qard.entity;

public final class QardDomainEnums {

    private QardDomainEnums() {
    }

    public enum QardType {
        DEPOSIT_QARD,
        LENDING_QARD
    }

    public enum RepaymentFrequency {
        MONTHLY,
        QUARTERLY,
        LUMP_SUM,
        ON_DEMAND
    }

    public enum Purpose {
        SOCIAL_WELFARE,
        EMPLOYEE_LOAN,
        EDUCATION,
        MEDICAL,
        EMERGENCY,
        WORKING_CAPITAL_MICRO,
        OTHER
    }

    public enum QardStatus {
        ACTIVE,
        REPAYING,
        FULLY_REPAID,
        DEFAULTED,
        WRITTEN_OFF,
        CANCELLED
    }

    public enum ScheduleStatus {
        PENDING,
        PAID,
        PARTIAL,
        OVERDUE,
        WAIVED
    }
}
