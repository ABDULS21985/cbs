package com.cbs.observability;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.cbs.common.exception.GlobalExceptionHandler;
import com.cbs.common.exception.ResourceNotFoundException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that log levels are used appropriately:
 * - INFO for successful operations
 * - WARN for expected business rule violations
 * - ERROR for unexpected infrastructure/system failures
 */
class LogLevelTest {

    private ListAppender<ILoggingEvent> listAppender;
    private Logger handlerLogger;

    @BeforeEach
    void setUp() {
        handlerLogger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        listAppender = new ListAppender<>();
        listAppender.start();
        handlerLogger.addAppender(listAppender);
    }

    @AfterEach
    void tearDown() {
        handlerLogger.detachAppender(listAppender);
        listAppender.stop();
    }

    @Test
    @DisplayName("Business exceptions (ResourceNotFoundException) log at WARN, not ERROR")
    void businessExceptionsLogAtWarn() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        handler.handleBusinessException(
            new ResourceNotFoundException("Customer", "id", 999L)
        );

        assertThat(listAppender.list).isNotEmpty();
        ILoggingEvent event = listAppender.list.get(0);
        assertThat(event.getLevel()).isEqualTo(Level.WARN);
    }

    @Test
    @DisplayName("Unhandled exceptions log at ERROR level with stack trace")
    void unhandledExceptionsLogAtError() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        handler.handleGeneric(new RuntimeException("Unexpected database timeout"));

        assertThat(listAppender.list).isNotEmpty();
        ILoggingEvent event = listAppender.list.get(0);
        assertThat(event.getLevel()).isEqualTo(Level.ERROR);
        // ERROR logs should include the throwable for stack trace
        assertThat(event.getThrowableProxy()).isNotNull();
        assertThat(event.getThrowableProxy().getMessage()).contains("Unexpected database timeout");
    }

    @Test
    @DisplayName("CBS logger level is configured to DEBUG in test profile")
    void cbsLoggerLevelConfigured() {
        Logger cbsLogger = (Logger) LoggerFactory.getLogger("com.cbs");
        // In test profile, com.cbs is set to DEBUG
        assertThat(cbsLogger.getLevel()).isIn(Level.DEBUG, null);
        // Effective level should be DEBUG or lower
        assertThat(cbsLogger.isDebugEnabled()).isTrue();
    }
}
