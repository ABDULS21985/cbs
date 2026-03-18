package com.cbs.ivr.repository;
import com.cbs.ivr.entity.IvrMenu;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface IvrMenuRepository extends JpaRepository<IvrMenu, Long> {
    Optional<IvrMenu> findByMenuCode(String code);
    List<IvrMenu> findByParentMenuIdAndIsActiveTrueOrderByMenuLevelAsc(Long parentId);
    List<IvrMenu> findByMenuLevelAndIsActiveTrueOrderByMenuCodeAsc(int level);
}
