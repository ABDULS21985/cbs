package com.cbs.gl.islamic.entity;

import com.cbs.gl.entity.IslamicAccountCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostingRuleEntry {
    private IslamicPostingEntryType entryType;
    private AccountResolutionType accountResolution;
    private String fixedAccountCode;
    private IslamicAccountCategory accountCategory;
    private String accountParameter;
    private AmountExpressionType amountExpression;
    private String customAmountExpression;
    private String narrationTemplate;
}
