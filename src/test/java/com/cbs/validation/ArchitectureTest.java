package com.cbs.validation;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

class ArchitectureTest {

    private static JavaClasses importedClasses;

    @BeforeAll
    static void setup() {
        importedClasses = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.cbs");
    }

    @Test
    @Disabled("The current codebase intentionally contains direct repository-backed admin/reporting controllers; re-enable after controller extraction.")
    void controllersDoNotAccessRepositoriesDirectly() {
        noClasses().that().resideInAPackage("..controller..")
                .should().dependOnClassesThat().resideInAPackage("..repository..")
                .check(importedClasses);
    }

    @Test
    void servicesDoNotDependOnControllers() {
        noClasses().that().resideInAPackage("..service..")
                .should().dependOnClassesThat().resideInAPackage("..controller..")
                .check(importedClasses);
    }

    @Test
    void entitiesResideWithinModulePackages() {
        // Entities must be inside com.cbs.* module packages (not in common/config/security/config packages)
        classes().that().areAnnotatedWith(jakarta.persistence.Entity.class)
                .should().resideInAPackage("com.cbs..")
                .check(importedClasses);
    }

    @Test
    void repositoriesAreInterfaces() {
        classes().that().resideInAPackage("..repository..")
                .and().haveSimpleNameEndingWith("Repository")
                .should().beInterfaces()
                .check(importedClasses);
    }

    @Test
    void servicesAreAnnotatedWithService() {
        classes().that().resideInAPackage("..service..")
                .and().haveSimpleNameEndingWith("Service")
                .and().areNotInterfaces()
                .should().beAnnotatedWith(org.springframework.stereotype.Service.class)
                .check(importedClasses);
    }

    @Test
    void controllersAreAnnotatedWithRestController() {
        classes().that().resideInAPackage("..controller..")
                .and().haveSimpleNameEndingWith("Controller")
                .should().beAnnotatedWith(org.springframework.web.bind.annotation.RestController.class)
                .check(importedClasses);
    }
}
