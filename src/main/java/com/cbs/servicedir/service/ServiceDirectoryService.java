package com.cbs.servicedir.service;
import com.cbs.servicedir.entity.ServiceDirectoryEntry;
import com.cbs.servicedir.repository.ServiceDirectoryEntryRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class ServiceDirectoryService {
    private final ServiceDirectoryEntryRepository entryRepository;
    @Transactional public ServiceDirectoryEntry create(ServiceDirectoryEntry entry) { return entryRepository.save(entry); }
    public List<ServiceDirectoryEntry> getByCategory(String category) { return entryRepository.findByServiceCategoryAndIsActiveTrueOrderByServiceNameAsc(category); }
    public List<ServiceDirectoryEntry> getAll() { return entryRepository.findByIsActiveTrueOrderByServiceCategoryAscServiceNameAsc(); }
}
