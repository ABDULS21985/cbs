package com.cbs.profitdistribution.entity;

public enum DistributionRunStatus {
    INITIATED,
    CALCULATED,
    CALCULATION_APPROVED,
    RESERVES_APPLIED,
    ALLOCATED,
    ALLOCATION_APPROVED,
    DISTRIBUTING,
    DISTRIBUTED,
    SSB_REVIEW_PENDING,
    SSB_CERTIFIED,
    SSB_WAIVED,
    COMPLETED,
    FAILED,
    REVERSED
}
