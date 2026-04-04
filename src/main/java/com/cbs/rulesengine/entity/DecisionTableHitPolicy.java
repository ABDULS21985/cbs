package com.cbs.rulesengine.entity;

public enum DecisionTableHitPolicy {
    FIRST_MATCH,
    ALL_MATCHES,
    PRIORITY,
    COLLECT_SUM,
    COLLECT_MIN,
    COLLECT_MAX
}
