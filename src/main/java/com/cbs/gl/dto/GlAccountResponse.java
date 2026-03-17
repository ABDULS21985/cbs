package com.cbs.gl.dto;

import com.cbs.gl.entity.GlCategory;
import com.cbs.gl.entity.NormalBalance;

import java.time.Instant;

public record GlAccountResponse(
        Long id,
        String glCode,
        String glName,
        GlCategory glCategory,
        String glSubCategory,
        String parentGlCode,
        Integer levelNumber,
        Boolean isHeader,
        Boolean isPostable,
        String currencyCode,
        Boolean isMultiCurrency,
        String branchCode,
        Boolean isInterBranch,
        NormalBalance normalBalance,
        Boolean allowManualPosting,
        Boolean requiresCostCentre,
        Boolean isActive,
        Instant createdAt,
        Instant updatedAt,
        String createdBy
) {
}
