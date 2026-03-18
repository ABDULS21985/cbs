package com.cbs.securitization.repository;
import com.cbs.securitization.entity.SecuritizationVehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface SecuritizationVehicleRepository extends JpaRepository<SecuritizationVehicle, Long> {
    Optional<SecuritizationVehicle> findByVehicleCode(String code);
    List<SecuritizationVehicle> findByVehicleTypeAndStatusOrderByVehicleNameAsc(String type, String status);
    List<SecuritizationVehicle> findByStatusOrderByVehicleNameAsc(String status);
}
