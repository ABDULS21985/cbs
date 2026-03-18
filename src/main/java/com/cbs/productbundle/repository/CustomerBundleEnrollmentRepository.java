package com.cbs.productbundle.repository;
import com.cbs.productbundle.entity.CustomerBundleEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CustomerBundleEnrollmentRepository extends JpaRepository<CustomerBundleEnrollment, Long> {
    List<CustomerBundleEnrollment> findByCustomerIdAndStatusOrderByEnrollmentDateDesc(Long customerId, String status);
}
