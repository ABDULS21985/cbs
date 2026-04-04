package com.cbs.productfactory.islamic.event;

public record FatwaRenewedEvent(Long oldFatwaId, Long newFatwaId, String oldFatwaNumber, String newFatwaNumber) {
}