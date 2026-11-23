#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env, String, Vec};

#[test]
fn test_submit_and_revoke_verification() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, Verifier);
    let client = VerifierClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let verifier = Address::generate(&env);
    let target = Address::generate(&env);

    let mut auditors = Vec::new(&env);
    auditors.push_back(verifier.clone());
    client.init(&admin, &auditors, &1u32);

    let audit_id = String::from_str(&env, "audit-001");
    let report_hash = String::from_str(&env, "QmReportHash123");

    let record = client.submit_verification(&verifier, &audit_id, &target, &report_hash, &85u32);
    assert_eq!(record.audit_id, audit_id);
    assert_eq!(record.status, VerificationStatus::Verified);
    assert!(client.is_verified(&audit_id));

    let revoked = client.revoke_verification(&admin, &audit_id);
    assert_eq!(revoked.status, VerificationStatus::Revoked);
    assert!(!client.is_verified(&audit_id));
}
