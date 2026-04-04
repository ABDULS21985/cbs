package com.cbs.productfactory.islamic.dto;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductChangeComparison {

    private Integer version1;
    private Integer version2;
    @Builder.Default
    private List<Difference> differences = new ArrayList<>();

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Difference {
        private String field;
        private Object oldValue;
        private Object newValue;
    }
}