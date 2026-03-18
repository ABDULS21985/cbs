package com.cbs.validation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class DigitFieldColumnAnnotationTest {

    private static final Pattern DIGIT_IN_NAME = Pattern.compile(".*\\d+.*");

    @Test
    void allDigitFieldsHaveExplicitColumnAnnotation() {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));

        List<String> violations = new ArrayList<>();

        for (BeanDefinition bd : scanner.findCandidateComponents("com.cbs")) {
            try {
                Class<?> clazz = Class.forName(bd.getBeanClassName());
                for (Field field : clazz.getDeclaredFields()) {
                    if (java.lang.reflect.Modifier.isStatic(field.getModifiers())) continue;
                    if (DIGIT_IN_NAME.matcher(field.getName()).matches()) {
                        Column col = field.getAnnotation(Column.class);
                        JoinColumn joinCol = field.getAnnotation(JoinColumn.class);
                        if ((col == null || col.name().isEmpty()) && (joinCol == null || joinCol.name().isEmpty())) {
                            violations.add(clazz.getSimpleName() + "." + field.getName()
                                    + " — digit in field name but no @Column(name=...)");
                        }
                    }
                }
            } catch (ClassNotFoundException ignored) {}
        }

        assertThat(violations)
                .as("Entity fields with digits must have explicit @Column(name=...) to prevent Hibernate naming bugs.\nViolations:\n" + String.join("\n", violations))
                .isEmpty();
    }
}
