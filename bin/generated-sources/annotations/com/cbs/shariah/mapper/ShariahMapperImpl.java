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
    date = "2026-04-04T15:14:32+0100",
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

        ssbBoardMember.fullName( request.getFullName() );
        ssbBoardMember.title( request.getTitle() );
        List<String> list = request.getQualifications();
        if ( list != null ) {
            ssbBoardMember.qualifications( new ArrayList<String>( list ) );
        }
        List<String> list1 = request.getSpecializations();
        if ( list1 != null ) {
            ssbBoardMember.specializations( new ArrayList<String>( list1 ) );
        }
        ssbBoardMember.appointmentDate( request.getAppointmentDate() );
        ssbBoardMember.expiryDate( request.getExpiryDate() );
        ssbBoardMember.isChairman( request.getIsChairman() );
        ssbBoardMember.votingWeight( request.getVotingWeight() );
        ssbBoardMember.contactEmail( request.getContactEmail() );
        ssbBoardMember.contactPhone( request.getContactPhone() );
        ssbBoardMember.nationality( request.getNationality() );

        return ssbBoardMember.build();
    }

    @Override
    public SsbMemberResponse toMemberResponse(SsbBoardMember entity) {
        if ( entity == null ) {
            return null;
        }

        SsbMemberResponse.SsbMemberResponseBuilder ssbMemberResponse = SsbMemberResponse.builder();

        ssbMemberResponse.id( entity.getId() );
        ssbMemberResponse.memberId( entity.getMemberId() );
        ssbMemberResponse.fullName( entity.getFullName() );
        ssbMemberResponse.title( entity.getTitle() );
        List<String> list = entity.getQualifications();
        if ( list != null ) {
            ssbMemberResponse.qualifications( new ArrayList<String>( list ) );
        }
        List<String> list1 = entity.getSpecializations();
        if ( list1 != null ) {
            ssbMemberResponse.specializations( new ArrayList<String>( list1 ) );
        }
        ssbMemberResponse.appointmentDate( entity.getAppointmentDate() );
        ssbMemberResponse.expiryDate( entity.getExpiryDate() );
        ssbMemberResponse.isActive( entity.getIsActive() );
        ssbMemberResponse.isChairman( entity.getIsChairman() );
        ssbMemberResponse.votingWeight( entity.getVotingWeight() );
        ssbMemberResponse.contactEmail( entity.getContactEmail() );
        ssbMemberResponse.contactPhone( entity.getContactPhone() );
        ssbMemberResponse.nationality( entity.getNationality() );
        ssbMemberResponse.createdAt( entity.getCreatedAt() );
        ssbMemberResponse.updatedAt( entity.getUpdatedAt() );

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

        fatwaRecord.fatwaTitle( request.getFatwaTitle() );
        fatwaRecord.fatwaCategory( request.getFatwaCategory() );
        fatwaRecord.subject( request.getSubject() );
        fatwaRecord.fullText( request.getFullText() );
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

        return fatwaRecord.build();
    }

    @Override
    public FatwaResponse toFatwaResponse(FatwaRecord entity) {
        if ( entity == null ) {
            return null;
        }

        FatwaResponse.FatwaResponseBuilder fatwaResponse = FatwaResponse.builder();

        fatwaResponse.id( entity.getId() );
        fatwaResponse.fatwaNumber( entity.getFatwaNumber() );
        fatwaResponse.fatwaTitle( entity.getFatwaTitle() );
        fatwaResponse.fatwaCategory( entity.getFatwaCategory() );
        fatwaResponse.subject( entity.getSubject() );
        fatwaResponse.fullText( entity.getFullText() );
        List<String> list = entity.getAaoifiReferences();
        if ( list != null ) {
            fatwaResponse.aaoifiReferences( new ArrayList<String>( list ) );
        }
        List<String> list1 = entity.getApplicableContractTypes();
        if ( list1 != null ) {
            fatwaResponse.applicableContractTypes( new ArrayList<String>( list1 ) );
        }
        fatwaResponse.conditions( entity.getConditions() );
        fatwaResponse.effectiveDate( entity.getEffectiveDate() );
        fatwaResponse.expiryDate( entity.getExpiryDate() );
        fatwaResponse.supersededByFatwaId( entity.getSupersededByFatwaId() );
        fatwaResponse.status( entity.getStatus() );
        fatwaResponse.issuedByBoardId( entity.getIssuedByBoardId() );
        fatwaResponse.approvedAt( entity.getApprovedAt() );
        fatwaResponse.createdBy( entity.getCreatedBy() );
        fatwaResponse.updatedBy( entity.getUpdatedBy() );
        fatwaResponse.createdAt( entity.getCreatedAt() );
        fatwaResponse.updatedAt( entity.getUpdatedAt() );
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

        if ( request.getFatwaTitle() != null ) {
            entity.setFatwaTitle( request.getFatwaTitle() );
        }
        if ( request.getFatwaCategory() != null ) {
            entity.setFatwaCategory( request.getFatwaCategory() );
        }
        if ( request.getSubject() != null ) {
            entity.setSubject( request.getSubject() );
        }
        if ( request.getFullText() != null ) {
            entity.setFullText( request.getFullText() );
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
    }

    @Override
    public ReviewRequestResponse toReviewResponse(SsbReviewRequest entity) {
        if ( entity == null ) {
            return null;
        }

        ReviewRequestResponse.ReviewRequestResponseBuilder reviewRequestResponse = ReviewRequestResponse.builder();

        reviewRequestResponse.id( entity.getId() );
        reviewRequestResponse.requestCode( entity.getRequestCode() );
        reviewRequestResponse.requestType( entity.getRequestType() );
        reviewRequestResponse.title( entity.getTitle() );
        reviewRequestResponse.description( entity.getDescription() );
        reviewRequestResponse.submittedBy( entity.getSubmittedBy() );
        reviewRequestResponse.submittedAt( entity.getSubmittedAt() );
        List<Long> list = entity.getAssignedMemberIds();
        if ( list != null ) {
            reviewRequestResponse.assignedMemberIds( new ArrayList<Long>( list ) );
        }
        reviewRequestResponse.requiredQuorum( entity.getRequiredQuorum() );
        reviewRequestResponse.currentApprovals( entity.getCurrentApprovals() );
        reviewRequestResponse.currentRejections( entity.getCurrentRejections() );
        reviewRequestResponse.linkedFatwaId( entity.getLinkedFatwaId() );
        reviewRequestResponse.linkedProductCode( entity.getLinkedProductCode() );
        reviewRequestResponse.linkedTransactionRef( entity.getLinkedTransactionRef() );
        reviewRequestResponse.reviewNotes( entity.getReviewNotes() );
        reviewRequestResponse.resolutionNotes( entity.getResolutionNotes() );
        reviewRequestResponse.resolvedAt( entity.getResolvedAt() );
        reviewRequestResponse.resolvedBy( entity.getResolvedBy() );
        reviewRequestResponse.status( entity.getStatus() );
        reviewRequestResponse.priority( entity.getPriority() );
        reviewRequestResponse.slaDeadline( entity.getSlaDeadline() );
        reviewRequestResponse.createdAt( entity.getCreatedAt() );
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

        voteResponse.id( entity.getId() );
        voteResponse.reviewRequestId( entity.getReviewRequestId() );
        voteResponse.memberId( entity.getMemberId() );
        voteResponse.vote( entity.getVote() );
        voteResponse.comments( entity.getComments() );
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
