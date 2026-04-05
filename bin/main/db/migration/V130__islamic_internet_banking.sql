-- Islamic Internet Banking Portal Configuration
-- Primarily API/BFF layer — minimal database footprint

-- 1. Portal configuration per tenant
CREATE TABLE IF NOT EXISTS cbs.islamic_portal_config (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT,
    default_language VARCHAR(10) NOT NULL DEFAULT 'EN',
    hijri_dates_enabled BOOLEAN NOT NULL DEFAULT true,
    bilingual_enabled BOOLEAN NOT NULL DEFAULT true,
    terminology_version VARCHAR(20) DEFAULT 'v1',
    marketplace_enabled BOOLEAN NOT NULL DEFAULT true,
    online_applications_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    version BIGINT DEFAULT 0,
    CONSTRAINT uq_islamic_portal_config_tenant UNIQUE (tenant_id)
);

-- 2. Application flow step definitions per contract type
CREATE TABLE IF NOT EXISTS cbs.islamic_application_flow (
    id BIGSERIAL PRIMARY KEY,
    product_code VARCHAR(50),
    contract_type VARCHAR(50) NOT NULL,
    step_number INT NOT NULL,
    step_code VARCHAR(50) NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    step_name_ar VARCHAR(200),
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    requires_consent BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_islamic_app_flow UNIQUE (contract_type, step_number)
);

-- 3. Shariah consent records (audit trail)
CREATE TABLE IF NOT EXISTS cbs.islamic_shariah_consent (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    application_ref VARCHAR(60),
    product_code VARCHAR(50),
    contract_type VARCHAR(50) NOT NULL,
    disclosure_version VARCHAR(20) NOT NULL DEFAULT 'v1',
    all_items_consented BOOLEAN NOT NULL DEFAULT false,
    consent_timestamp TIMESTAMPTZ,
    consent_method VARCHAR(20),
    ip_address VARCHAR(45),
    device_info VARCHAR(500),
    user_agent VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    version BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_shariah_consent_customer ON cbs.islamic_shariah_consent (customer_id);
CREATE INDEX IF NOT EXISTS idx_shariah_consent_app ON cbs.islamic_shariah_consent (application_ref);
CREATE UNIQUE INDEX IF NOT EXISTS uq_shariah_consent_app_version ON cbs.islamic_shariah_consent (application_ref, disclosure_version);

-- 4. Shariah disclosure templates per contract type
CREATE TABLE IF NOT EXISTS cbs.islamic_disclosure_template (
    id BIGSERIAL PRIMARY KEY,
    contract_type VARCHAR(50) NOT NULL,
    item_order INT NOT NULL,
    text_en TEXT NOT NULL,
    text_ar TEXT,
    requires_explicit_consent BOOLEAN NOT NULL DEFAULT true,
    disclosure_version VARCHAR(20) NOT NULL DEFAULT 'v1',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disclosure_tpl_type ON cbs.islamic_disclosure_template (contract_type, status);

-- SEED: Default portal config
INSERT INTO cbs.islamic_portal_config (tenant_id, default_language, hijri_dates_enabled, bilingual_enabled) VALUES (NULL, 'EN', true, true) ON CONFLICT DO NOTHING;

-- SEED: Application flow steps per contract type
INSERT INTO cbs.islamic_application_flow (contract_type, step_number, step_code, step_name, step_name_ar, is_mandatory, requires_consent) VALUES
('WADIAH', 1, 'PRODUCT_SELECTION', 'Product Selection', 'اختيار المنتج', true, false),
('WADIAH', 2, 'ELIGIBILITY_CHECK', 'Eligibility Check', 'فحص الأهلية', true, false),
('WADIAH', 3, 'SHARIAH_DISCLOSURE', 'Shariah Disclosure', 'الإفصاح الشرعي', true, true),
('WADIAH', 4, 'APPLICATION_DETAILS', 'Application Details', 'تفاصيل الطلب', true, false),
('WADIAH', 5, 'DOCUMENT_UPLOAD', 'Document Upload', 'رفع المستندات', false, false),
('WADIAH', 6, 'REVIEW_SUBMIT', 'Review & Submit', 'المراجعة والتقديم', true, false),
('MUDARABAH', 1, 'PRODUCT_SELECTION', 'Product Selection', 'اختيار المنتج', true, false),
('MUDARABAH', 2, 'ELIGIBILITY_CHECK', 'Eligibility Check', 'فحص الأهلية', true, false),
('MUDARABAH', 3, 'SHARIAH_DISCLOSURE', 'Shariah Disclosure', 'الإفصاح الشرعي', true, true),
('MUDARABAH', 4, 'APPLICATION_DETAILS', 'Application Details', 'تفاصيل الطلب', true, false),
('MUDARABAH', 5, 'DOCUMENT_UPLOAD', 'Document Upload', 'رفع المستندات', false, false),
('MUDARABAH', 6, 'REVIEW_SUBMIT', 'Review & Submit', 'المراجعة والتقديم', true, false),
('MURABAHA', 1, 'PRODUCT_SELECTION', 'Product Selection', 'اختيار المنتج', true, false),
('MURABAHA', 2, 'ELIGIBILITY_CHECK', 'Eligibility Check', 'فحص الأهلية', true, false),
('MURABAHA', 3, 'SHARIAH_DISCLOSURE', 'Shariah Disclosure', 'الإفصاح الشرعي', true, true),
('MURABAHA', 4, 'APPLICATION_DETAILS', 'Application Details', 'تفاصيل الطلب', true, false),
('MURABAHA', 5, 'ASSET_DETAILS', 'Asset Details', 'تفاصيل الأصل', true, false),
('MURABAHA', 6, 'DOCUMENT_UPLOAD', 'Document Upload', 'رفع المستندات', true, false),
('MURABAHA', 7, 'REVIEW_SUBMIT', 'Review & Submit', 'المراجعة والتقديم', true, false),
('IJARAH', 1, 'PRODUCT_SELECTION', 'Product Selection', 'اختيار المنتج', true, false),
('IJARAH', 2, 'ELIGIBILITY_CHECK', 'Eligibility Check', 'فحص الأهلية', true, false),
('IJARAH', 3, 'SHARIAH_DISCLOSURE', 'Shariah Disclosure', 'الإفصاح الشرعي', true, true),
('IJARAH', 4, 'APPLICATION_DETAILS', 'Application Details', 'تفاصيل الطلب', true, false),
('IJARAH', 5, 'ASSET_DETAILS', 'Asset Details', 'تفاصيل الأصل', true, false),
('IJARAH', 6, 'DOCUMENT_UPLOAD', 'Document Upload', 'رفع المستندات', true, false),
('IJARAH', 7, 'REVIEW_SUBMIT', 'Review & Submit', 'المراجعة والتقديم', true, false),
('MUSHARAKAH', 1, 'PRODUCT_SELECTION', 'Product Selection', 'اختيار المنتج', true, false),
('MUSHARAKAH', 2, 'ELIGIBILITY_CHECK', 'Eligibility Check', 'فحص الأهلية', true, false),
('MUSHARAKAH', 3, 'SHARIAH_DISCLOSURE', 'Shariah Disclosure', 'الإفصاح الشرعي', true, true),
('MUSHARAKAH', 4, 'APPLICATION_DETAILS', 'Application Details', 'تفاصيل الطلب', true, false),
('MUSHARAKAH', 5, 'ASSET_DETAILS', 'Asset Details', 'تفاصيل الأصل', true, false),
('MUSHARAKAH', 6, 'DOCUMENT_UPLOAD', 'Document Upload', 'رفع المستندات', true, false),
('MUSHARAKAH', 7, 'REVIEW_SUBMIT', 'Review & Submit', 'المراجعة والتقديم', true, false)
ON CONFLICT DO NOTHING;

-- SEED: Shariah disclosure templates
INSERT INTO cbs.islamic_disclosure_template (contract_type, item_order, text_en, text_ar, requires_explicit_consent) VALUES
-- WADIAH disclosures
('WADIAH', 1, 'Your funds are held under Wadiah Yad Dhamanah (safekeeping with guarantee). The bank guarantees the return of your principal.', 'يتم حفظ أموالك بموجب عقد الوديعة يد الضمانة. يضمن البنك إعادة رأس مالك.', true),
('WADIAH', 2, 'No profit or return is contractually guaranteed on this account. Any return is subject to bank performance.', 'لا يوجد ربح أو عائد مضمون تعاقدياً على هذا الحساب. أي عائد يخضع لأداء البنك.', true),
('WADIAH', 3, 'Any Hibah (gift) distributed is at the sole discretion of the bank and may vary or not be distributed in any period.', 'أي هبة يتم توزيعها تكون وفقاً لتقدير البنك المطلق وقد تختلف أو لا يتم توزيعها في أي فترة.', true),
('WADIAH', 4, 'You acknowledge your obligation to pay Zakat on eligible balances held in this account.', 'تقر بالتزامك بدفع الزكاة على الأرصدة المؤهلة في هذا الحساب.', true),
-- MUDARABAH disclosures
('MUDARABAH', 1, 'This is a profit-sharing investment account, not a fixed-return deposit. Returns depend on actual investment performance.', 'هذا حساب استثمار بالمضاربة وليس وديعة بعائد ثابت. العوائد تعتمد على الأداء الفعلي للاستثمار.', true),
('MUDARABAH', 2, 'You bear investment losses proportional to your capital contribution. The bank, as Mudarib, does not share in capital losses.', 'تتحمل خسائر الاستثمار بما يتناسب مع مساهمتك في رأس المال. البنك بصفته المضارب لا يشارك في خسائر رأس المال.', true),
('MUDARABAH', 3, 'Profit will be shared according to the agreed profit-sharing ratio. The indicative rate is not a guarantee of future returns.', 'يتم تقاسم الأرباح وفقاً لنسبة تقاسم الأرباح المتفق عليها. المعدل الإرشادي ليس ضماناً للعوائد المستقبلية.', true),
('MUDARABAH', 4, 'Profit Equalisation Reserve (PER) and Investment Risk Reserve (IRR) may be applied to smooth or protect your returns.', 'قد يتم تطبيق احتياطي معادلة الأرباح واحتياطي مخاطر الاستثمار لتنظيم أو حماية عوائدك.', true),
-- MURABAHA disclosures
('MURABAHA', 1, 'The bank will purchase the asset and sell it to you at a disclosed cost-plus markup. The total selling price is fixed once the contract is signed.', 'سيقوم البنك بشراء الأصل وبيعه لك بتكلفة مع هامش ربح معلن. إجمالي سعر البيع ثابت بمجرد توقيع العقد.', true),
('MURABAHA', 2, 'You are obligated to pay the full selling price in installments as per the agreed schedule.', 'أنت ملزم بدفع كامل سعر البيع على أقساط وفقاً للجدول المتفق عليه.', true),
('MURABAHA', 3, 'Late payment charges are donated to charity and are not retained by the bank as income.', 'رسوم التأخير في السداد يتم التبرع بها للجمعيات الخيرية ولا يحتفظ بها البنك كدخل.', true),
('MURABAHA', 4, 'In case of early settlement, the bank may waive unearned profit (Ibra) at its discretion.', 'في حالة التسوية المبكرة، قد يتنازل البنك عن الربح غير المكتسب (الإبراء) وفقاً لتقديره.', true),
-- IJARAH disclosures
('IJARAH', 1, 'The bank will purchase and own the asset throughout the lease period. You pay rental for the right to use the asset.', 'سيقوم البنك بشراء وامتلاك الأصل طوال فترة الإجارة. تدفع إيجاراً مقابل حق استخدام الأصل.', true),
('IJARAH', 2, 'The bank is responsible for major maintenance and Takaful (insurance) of the asset during the lease.', 'البنك مسؤول عن الصيانة الرئيسية والتكافل (التأمين) على الأصل خلال فترة الإجارة.', true),
('IJARAH', 3, 'If the asset is totally destroyed through no fault of yours, the lease terminates and you are released from future rental obligations.', 'إذا تم تدمير الأصل بالكامل دون خطأ منك، تنتهي الإجارة ويتم إعفاؤك من التزامات الإيجار المستقبلية.', true),
('IJARAH', 4, 'For Ijarah Muntahia Bittamleek: ownership will transfer to you at the end of the lease term as per the agreed mechanism.', 'بالنسبة للإجارة المنتهية بالتمليك: ستنتقل الملكية إليك في نهاية مدة الإجارة وفقاً للآلية المتفق عليها.', true),
-- MUSHARAKAH disclosures
('MUSHARAKAH', 1, 'You and the bank will jointly own the asset. You pay rental on the bank''s share and gradually purchase the bank''s units.', 'ستمتلك أنت والبنك الأصل بشكل مشترك. تدفع إيجاراً على حصة البنك وتشتري وحدات البنك تدريجياً.', true),
('MUSHARAKAH', 2, 'As you purchase more units, your ownership increases and the rental portion decreases proportionally.', 'كلما اشتريت المزيد من الوحدات، تزداد ملكيتك وينخفض الإيجار بشكل متناسب.', true),
('MUSHARAKAH', 3, 'Losses are shared strictly proportional to capital contribution, not the profit-sharing ratio.', 'يتم تقاسم الخسائر بشكل صارم بما يتناسب مع المساهمة في رأس المال وليس نسبة تقاسم الأرباح.', true),
('MUSHARAKAH', 4, 'The unit price may be fixed at inception or subject to periodic revaluation as per the contract terms.', 'قد يكون سعر الوحدة ثابتاً عند البداية أو خاضعاً لإعادة التقييم الدوري وفقاً لشروط العقد.', true)
ON CONFLICT DO NOTHING;
