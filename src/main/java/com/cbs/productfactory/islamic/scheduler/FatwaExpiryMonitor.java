package com.cbs.productfactory.islamic.scheduler;

import com.cbs.productfactory.islamic.event.FatwaExpiredEvent;
import com.cbs.shariah.entity.FatwaStatus;
import com.cbs.shariah.repository.FatwaRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class FatwaExpiryMonitor {

    private final FatwaRecordRepository fatwaRecordRepository;
    private final ApplicationEventPublisher applicationEventPublisher;

    @Scheduled(cron = "0 0 6 * * *")
    public void checkFatwaExpiry() {
        LocalDate today = LocalDate.now();
        fatwaRecordRepository.findByStatusAndExpiryDateLessThanEqual(FatwaStatus.ACTIVE, today)
                .forEach(fatwa -> applicationEventPublisher.publishEvent(
                        new FatwaExpiredEvent(fatwa.getId(), fatwa.getFatwaNumber(), fatwa.getExpiryDate())));

        fatwaRecordRepository.findByStatusAndExpiryDateBetween(FatwaStatus.ACTIVE, today.plusDays(1), today.plusDays(30))
                .forEach(fatwa -> log.warn("Fatwa {} expires within 30 days on {}", fatwa.getFatwaNumber(), fatwa.getExpiryDate()));

        fatwaRecordRepository.findByStatusAndExpiryDateBetween(FatwaStatus.ACTIVE, today.plusDays(31), today.plusDays(90))
                .forEach(fatwa -> log.info("Fatwa {} expires within 90 days on {}", fatwa.getFatwaNumber(), fatwa.getExpiryDate()));
    }
}