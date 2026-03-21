package com.cbs.notification.repository;

import com.cbs.notification.entity.NotificationTemplateVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationTemplateVersionRepository extends JpaRepository<NotificationTemplateVersion, Long> {

    List<NotificationTemplateVersion> findByTemplateIdOrderByVersionNumberDesc(Long templateId);

    @Query("SELECT MAX(v.versionNumber) FROM NotificationTemplateVersion v WHERE v.templateId = :templateId")
    Optional<Integer> findMaxVersionNumber(@Param("templateId") Long templateId);
}
