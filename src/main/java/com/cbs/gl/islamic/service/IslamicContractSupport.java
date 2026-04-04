package com.cbs.gl.islamic.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.gl.entity.IslamicAccountCategory;
import org.springframework.util.StringUtils;

import java.util.Locale;
import java.util.Set;

final class IslamicContractSupport {

    private static final Set<String> SUPPORTED_CONTRACT_TYPES = Set.of(
            "ALL", "MURABAHA", "IJARAH", "MUSHARAKAH", "MUDARABAH",
            "SALAM", "ISTISNA", "WAKALAH", "SUKUK", "TAKAFUL", "QARD", "WADIAH");

    private IslamicContractSupport() {
    }

    static String normalize(String contractTypeCode) {
        return StringUtils.hasText(contractTypeCode)
                ? contractTypeCode.trim().toUpperCase(Locale.ROOT)
                : null;
    }

    static void validate(String contractTypeCode) {
        String normalized = normalize(contractTypeCode);
        if (normalized == null) {
            return;
        }
        if (!SUPPORTED_CONTRACT_TYPES.contains(normalized)) {
            throw new BusinessException("Unsupported Islamic contract type: " + contractTypeCode, "INVALID_CONTRACT_TYPE");
        }
    }

    static IslamicAccountCategory financingCategoryFor(String contractTypeCode) {
        return switch (normalize(contractTypeCode)) {
            case "MURABAHA" -> IslamicAccountCategory.FINANCING_RECEIVABLE_MURABAHA;
            case "IJARAH" -> IslamicAccountCategory.FINANCING_RECEIVABLE_IJARAH;
            case "MUSHARAKAH" -> IslamicAccountCategory.FINANCING_RECEIVABLE_MUSHARAKAH;
            case "MUDARABAH" -> IslamicAccountCategory.FINANCING_RECEIVABLE_MUDARABAH;
            case "SALAM" -> IslamicAccountCategory.FINANCING_RECEIVABLE_SALAM;
            case "ISTISNA" -> IslamicAccountCategory.FINANCING_RECEIVABLE_ISTISNA;
            default -> throw new BusinessException("No financing receivable category for contract type: " + contractTypeCode,
                    "UNSUPPORTED_CONTRACT_TYPE");
        };
    }

    static IslamicAccountCategory incomeCategoryFor(String contractTypeCode) {
        return switch (normalize(contractTypeCode)) {
            case "MURABAHA" -> IslamicAccountCategory.MURABAHA_INCOME;
            case "IJARAH" -> IslamicAccountCategory.IJARAH_INCOME;
            case "MUSHARAKAH" -> IslamicAccountCategory.MUSHARAKAH_INCOME;
            case "MUDARABAH" -> IslamicAccountCategory.MUDARABAH_INCOME;
            case "SALAM" -> IslamicAccountCategory.SALAM_INCOME;
            case "ISTISNA" -> IslamicAccountCategory.ISTISNA_INCOME;
            case "SUKUK" -> IslamicAccountCategory.SUKUK_INCOME;
            case "WAKALAH" -> IslamicAccountCategory.WAKALAH_FEE_INCOME;
            case "TAKAFUL" -> IslamicAccountCategory.TAKAFUL_INCOME;
            default -> throw new BusinessException("No income category for contract type: " + contractTypeCode,
                    "UNSUPPORTED_CONTRACT_TYPE");
        };
    }
}
