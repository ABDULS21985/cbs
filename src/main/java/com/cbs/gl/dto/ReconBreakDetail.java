package com.cbs.gl.dto;

import java.math.BigDecimal;

public record ReconBreakDetail(
        String account,
        BigDecimal subLedger,
        BigDecimal gl,
        BigDecimal diff
) {
    public static ReconBreakDetail of(String account, BigDecimal subLedger, BigDecimal gl) {
        return new ReconBreakDetail(account, subLedger, gl, subLedger.subtract(gl));
    }
}
