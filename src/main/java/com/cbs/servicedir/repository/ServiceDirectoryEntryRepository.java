package com.cbs.servicedir.repository;
import com.cbs.servicedir.entity.ServiceDirectoryEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface ServiceDirectoryEntryRepository extends JpaRepository<ServiceDirectoryEntry, Long> {
    Optional<ServiceDirectoryEntry> findByServiceCode(String code);
    List<ServiceDirectoryEntry> findByServiceCategoryAndIsActiveTrueOrderByServiceNameAsc(String category);
    List<ServiceDirectoryEntry> findByIsActiveTrueOrderByServiceCategoryAscServiceNameAsc();
}
