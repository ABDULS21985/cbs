package com.cbs.productfactory.islamic.event;

import java.time.LocalDate;

public record FatwaExpiredEvent(Long fatwaId, String fatwaNumber, LocalDate expiryDate) {
}