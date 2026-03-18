package com.cbs.validation;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.Entity;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;

import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AuditableEntityComplianceTest {

    @Test
    void allAuditableSubclassesHaveNoArgConstructorAndBuilder() {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));

        List<String> violations = new ArrayList<>();

        for (BeanDefinition bd : scanner.findCandidateComponents("com.cbs")) {
            try {
                Class<?> clazz = Class.forName(bd.getBeanClassName());
                if (AuditableEntity.class.isAssignableFrom(clazz) && !clazz.equals(AuditableEntity.class)) {
                    // Check no-arg constructor exists (effect of @NoArgsConstructor)
                    boolean hasNoArgCtor = false;
                    for (Constructor<?> ctor : clazz.getDeclaredConstructors()) {
                        if (ctor.getParameterCount() == 0) { hasNoArgCtor = true; break; }
                    }
                    if (!hasNoArgCtor)
                        violations.add(clazz.getSimpleName() + " extends AuditableEntity but has no no-arg constructor (@NoArgsConstructor)");

                    // Check builder() method exists (effect of @SuperBuilder)
                    boolean hasBuilder = false;
                    for (Method m : clazz.getDeclaredMethods()) {
                        if ("builder".equals(m.getName()) && m.getParameterCount() == 0) { hasBuilder = true; break; }
                    }
                    if (!hasBuilder)
                        violations.add(clazz.getSimpleName() + " extends AuditableEntity but has no builder() method (@SuperBuilder)");
                }
            } catch (ClassNotFoundException ignored) {}
        }

        assertThat(violations)
                .as("AuditableEntity subclasses must have no-arg constructor + builder() method.\nViolations:\n" + String.join("\n", violations))
                .isEmpty();
    }
}
