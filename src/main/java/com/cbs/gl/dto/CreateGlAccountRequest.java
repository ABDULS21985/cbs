package com.cbs.gl.dto;

import com.cbs.gl.entity.GlCategory;
import com.cbs.gl.entity.NormalBalance;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateGlAccountRequest(
        @NotBlank String glCode,
        @NotBlank String glName,
        @NotNull GlCategory glCategory,
        String glSubCategory,
        String parentGlCode,
        Integer levelNumber,
        Boolean isHeader,
        Boolean isPostable,
        String currencyCode,
        Boolean isMultiCurrency,
        String branchCode,
        Boolean isInterBranch,
        @NotNull NormalBalance normalBalance,
        Boolean allowManualPosting,
        Boolean requiresCostCentre,
        Boolean isActive
) {
}
