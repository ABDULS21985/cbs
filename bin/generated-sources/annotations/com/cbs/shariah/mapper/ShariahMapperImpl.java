package com.cbs.shariah.mapper;

import com.cbs.shariah.dto.CreateFatwaRequest;
import com.cbs.shariah.dto.CreateSsbMemberRequest;
import com.cbs.shariah.dto.FatwaResponse;
import com.cbs.shariah.dto.ReviewRequestResponse;
import com.cbs.shariah.dto.SsbMemberResponse;
import com.cbs.shariah.dto.UpdateFatwaRequest;
import com.cbs.shariah.dto.VoteResponse;
import com.cbs.shariah.entity.FatwaRecord;
import com.cbs.shariah.entity.SsbBoardMember;
import com.cbs.shariah.entity.SsbReviewRequest;
import com.cbs.shariah.entity.SsbVote;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-04-04T21:19:48+0100",
    comments = "version: 1.6.2, compiler: Eclipse JDT (IDE) 3.45.0.v20260224-0835, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class ShariahMapperImpl implements ShariahMapper {

    @Override
    public SsbBoardMember toEntity(CreateSsbMemberRequest request) {
        if ( request == null ) {
            return null;
        }

        SsbBoardMember.SsbBoardMemberBuilder ssbBoardMember = SsbBoardMember.builder();

        ssbBoardMember.appointmentDate( request.getAppointmentDate() );
        ssbBoardMember.contactEmail( request.getContactEmail() );
        ssbBoardMember.contactPhone( request.getContactPhone() );
        ssbBoardMember.expiryDate( request.getExpiryDate() );
        ssbBoardMember.fullName( request.getFullName() );
        ssbBoardMember.isChairman( request.getIsChairman() );
        ssbBoardMember.nationality( request.getNationality() );
        List<String> list = request.getQualifications();
        if ( list != null ) {
            ssbBoardMember.qualifications( new ArrayList<String>( list ) );
        }
        List<String> list1 = request.getSpecializations();
        if ( list1 != null ) {
            ssbBoardMember.specializations( new ArrayList<String>( list1 ) );
        }
        ssbBoardMember.title( request.getTitle() );
        ssbBoardMember.votingWeight( request.getVotingWeight() );

        return ssbBoardMember.build();
    }

    @Override
    public SsbMemberResponse toMemberResponse(SsbBoardMember entity) {
        if ( entity == null ) {
            return null;
        }

        SsbMemberResponse.SsbMemberResponseBuilder ssbMemberResponse = SsbMemberResponse.builder();

        ssbMemberResponse.appointmentDate( entity.getAppointmentDate() );
        ssbMemberResponse.contactEmail( entity.getContactEmail() );
        ssbMemberResponse.contactPhone( entity.getContactPhone() );
        ssbMemberResponse.createdAt( entity.getCreatedAt() );
        ssbMemberResponse.expiryDate( entity.getExpiryDate() );
        ssbMemberResponse.fullName( entity.getFullName() );
        ssbMemberResponse.id( entity.getId() );
        ssbMemberResponse.isActive( entity.getIsActive() );
        ssbMemberResponse.isChairman( entity.getIsChairman() );
        ssbMemberResponse.memberId( entity.getMemberId() );
        ssbMemberResponse.nationality( entity.getNationality() );
        List<String> list = entity.getQualifications();
        if ( list != null ) {
            ssbMemberResponse.qualifications( new ArrayList<String>( list ) );
        }
        List<String> list1 = entity.getSpecializations();
        if ( list1 != null ) {
            ssbMemberResponse.specializations( new ArrayList<String>( list1 ) );
        }
        ssbMemberResponse.title( entity.getTitle() );
        ssbMemberResponse.updatedAt( entity.getUpdatedAt() );
        ssbMemberResponse.votingWeight( entity.getVotingWeight() );

        return ssbMemberResponse.build();
    }

    @Override
    public List<SsbMemberResponse> toMemberResponseList(List<SsbBoardMember> entities) {
        if ( entities == null ) {
            return null;
        }

        List<SsbMemberResponse> list = new ArrayList<SsbMemberResponse>( entities.size() );
        for ( SsbBoardMember ssbBoardMember : entities ) {
            list.add( toMemberResponse( ssbBoardMember ) );
        }

        return list;
    }

    @Override
    public FatwaRecord toEntity(CreateFatwaRequest request) {
        if ( request == null ) {
            return null;
        }

        FatwaRecord.FatwaRecordBuilder fatwaRecord = FatwaRecord.builder();

        List<String> list = request.getAaoifiReferences();
        if ( list != null ) {
            fatwaRecord.aaoifiReferences( new ArrayList<String>( list ) );
        }
        List<String> list1 = request.getApplicableContractTypes();
        if ( list1 != null ) {
            fatwaRecord.applicableContractTypes( new ArrayList<String>( list1 ) );
        }
        fatwaRecord.conditions( request.getConditions() );
        fatwaRecord.effectiveDate( request.getEffectiveDate() );
        fatwaRecord.expiryDate( request.getExpiryDate() );
        fatwaRecord.fatwaCategory( request.getFatwaCategory() );
        fatwaRecord.fatwaTitle( request.getFatwaTitle() );
        fatwaRecord.fullText( request.getFullText() );
        fatwaRecord.subject( request.getSubject() );

        return fatwaRecord.build();
    }

    @Override
    public FatwaResponse toFatwaResponse(FatwaRecord entity) {
        if ( entity == null ) {
            return null;
        }

        FatwaResponse.FatwaResponseBuilder fatwaResponse = FatwaResponse.builder();

        List<String> list = entity.getAaoifiReferences();
        if ( list != null ) {
            fatwaResponse.aaoifiReferences( new ArrayList<String>( list ) );
        }
        List<String> list1 = entity.getApplicableContractTypes();
        if ( list1 != null ) {
            fatwaResponse.applicableContractTypes( new ArrayList<String>( list1 ) );
        }
        fatwaResponse.approvedAt( entity.getApprovedAt() );
        fatwaResponse.conditions( entity.getConditions() );
        fatwaResponse.createdAt( entity.getCreatedAt() );
        fatwaResponse.createdBy( entity.getCreatedBy() );
        fatwaResponse.effectiveDate( entity.getEffectiveDate() );
        fatwaResponse.expiryDate( entity.getExpiryDate() );
        fatwaResponse.fatwaCategory( entity.getFatwaCategory() );
        fatwaResponse.fatwaNumber( entity.getFatwaNumber() );
        fatwaResponse.fatwaTitle( entity.getFatwaTitle() );
        fatwaResponse.fullText( entity.getFullText() );
        fatwaResponse.id( entity.getId() );
        fatwaResponse.issuedByBoardId( entity.getIssuedByBoardId() );
        fatwaResponse.status( entity.getStatus() );
        fatwaResponse.subject( entity.getSubject() );
        fatwaResponse.supersededByFatwaId( entity.getSupersededByFatwaId() );
        fatwaResponse.updatedAt( entity.getUpdatedAt() );
        fatwaResponse.updatedBy( entity.getUpdatedBy() );
        fatwaResponse.version( entity.getVersion() );

        return fatwaResponse.build();
    }

    @Override
    public List<FatwaResponse> toFatwaResponseList(List<FatwaRecord> entities) {
        if ( entities == null ) {
            return null;
        }

        List<FatwaResponse> list = new ArrayList<FatwaResponse>( entities.size() );
        for ( FatwaRecord fatwaRecord : entities ) {
            list.add( toFatwaResponse( fatwaRecord ) );
        }

        return list;
    }

    @Override
    public void updateFatwaFromRequest(UpdateFatwaRequest request, FatwaRecord entity) {
        if ( request == null ) {
            return;
        }

        if ( entity.getAaoifiReferences() != null ) {
            List<String> list = request.getAaoifiReferences();
            if ( list != null ) {
                entity.getAaoifiReferences().clear();
                entity.getAaoifiReferences().addAll( list );
            }
        }
        else {
            List<String> list = request.getAaoifiReferences();
            if ( list != null ) {
                entity.setAaoifiReferences( new ArrayList<String>( list ) );
            }
        }
        if ( entity.getApplicableContractTypes() != null ) {
            List<String> list1 = request.getApplicableContractTypes();
            if ( list1 != null ) {
                entity.getApplicableContractTypes().clear();
                entity.getApplicableContractTypes().addAll( list1 );
            }
        }
        else {
            List<String> list1 = request.getApplicableContractTypes();
            if ( list1 != null ) {
                entity.setApplicableContractTypes( new ArrayList<String>( list1 ) );
            }
        }
        if ( request.getConditions() != null ) {
            entity.setConditions( request.getConditions() );
        }
        if ( request.getEffectiveDate() != null ) {
            entity.setEffectiveDate( request.getEffectiveDate() );
        }
        if ( request.getExpiryDate() != null ) {
            entity.setExpiryDate( request.getExpiryDate() );
        }
        if ( request.getFatwaCategory() != null ) {
            entity.setFatwaCategory( request.getFatwaCategory() );
        }
        if ( request.getFatwaTitle() != null ) {
            entity.setFatwaTitle( request.getFatwaTitle() );
        }
        if ( request.getFullText() != null ) {
            entity.setFullText( request.getFullText() );
        }
        if ( request.getSubject() != null ) {
            entity.setSubject( request.getSubject() );
        }
    }

    @Override
    public ReviewRequestResponse toReviewResponse(SsbReviewRequest entity) {
        if ( entity == null ) {
            return null;
        }

        ReviewRequestResponse.ReviewRequestResponseBuilder reviewRequestResponse = ReviewRequestResponse.builder();

        List<Long> list = entity.getAssignedMemberIds();
        if ( list != null ) {
            reviewRequestResponse.assignedMemberIds( new ArrayList<Long>( list ) );
        }
        reviewRequestResponse.createdAt( entity.getCreatedAt() );
        reviewRequestResponse.currentApprovals( entity.getCurrentApprovals() );
        reviewRequestResponse.currentRejections( entity.getCurrentRejections() );
        reviewRequestResponse.description( entity.getDescription() );
        reviewRequestResponse.id( entity.getId() );
        reviewRequestResponse.linkedFatwaId( entity.getLinkedFatwaId() );
        reviewRequestResponse.linkedProductCode( entity.getLinkedProductCode() );
        reviewRequestResponse.linkedTransactionRef( entity.getLinkedTransactionRef() );
        reviewRequestResponse.priority( entity.getPriority() );
        reviewRequestResponse.requestCode( entity.getRequestCode() );
        reviewRequestResponse.requestType( entity.getRequestType() );
        reviewRequestResponse.requiredQuorum( entity.getRequiredQuorum() );
        reviewRequestResponse.resolutionNotes( entity.getResolutionNotes() );
        reviewRequestResponse.resolvedAt( entity.getResolvedAt() );
        reviewRequestResponse.resolvedBy( entity.getResolvedBy() );
        reviewRequestResponse.reviewNotes( entity.getReviewNotes() );
        reviewRequestResponse.slaDeadline( entity.getSlaDeadline() );
        reviewRequestResponse.status( entity.getStatus() );
        reviewRequestResponse.submittedAt( entity.getSubmittedAt() );
        reviewRequestResponse.submittedBy( entity.getSubmittedBy() );
        reviewRequestResponse.title( entity.getTitle() );
        reviewRequestResponse.updatedAt( entity.getUpdatedAt() );

        return reviewRequestResponse.build();
    }

    @Override
    public List<ReviewRequestResponse> toReviewResponseList(List<SsbReviewRequest> entities) {
        if ( entities == null ) {
            return null;
        }

        List<ReviewRequestResponse> list = new ArrayList<ReviewRequestResponse>( entities.size() );
        for ( SsbReviewRequest ssbReviewRequest : entities ) {
            list.add( toReviewResponse( ssbReviewRequest ) );
        }

        return list;
    }

    @Override
    public VoteResponse toVoteResponse(SsbVote entity) {
        if ( entity == null ) {
            return null;
        }

        VoteResponse.VoteResponseBuilder voteResponse = VoteResponse.builder();

        voteResponse.comments( entity.getComments() );
        voteResponse.id( entity.getId() );
        voteResponse.memberId( entity.getMemberId() );
        voteResponse.reviewRequestId( entity.getReviewRequestId() );
        voteResponse.vote( entity.getVote() );
        voteResponse.votedAt( entity.getVotedAt() );

        return voteResponse.build();
    }

    @Override
    public List<VoteResponse> toVoteResponseList(List<SsbVote> entities) {
        if ( entities == null ) {
            return null;
        }

        List<VoteResponse> list = new ArrayList<VoteResponse>( entities.size() );
        for ( SsbVote ssbVote : entities ) {
            list.add( toVoteResponse( ssbVote ) );
        }

        return list;
    }
}
