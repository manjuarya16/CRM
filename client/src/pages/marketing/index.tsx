import React from "react";
import { useParams } from "react-router-dom";
import { Home } from "@/components/marketing/home";
import {
  FeaturesPage as Features,
  FeaturePage,
  ProductPage as Product,
  IntegrationsPage as Integrations,
  SolutionsPage as Solutions,
  SolutionPage,
  PricingPage as Pricing,
  BookingPage,
  ContactPage as Contact,
  ResourcesPage as Resources,
  ArticlePage,
  AboutPage as About,
  SecurityPage as Security,
  LegalPage,
  CareersPage as Careers,
} from "@/components/marketing/pages";

export const LandingPage = () => <Home />;
export const FeaturesPage = () => <Features />;
export const FeatureDetailPage = () => {
  const { feature } = useParams();
  return <FeaturePage kind={feature || ""} />;
};
export const ProductPage = () => <Product />;
export const IntegrationsPage = () => <Integrations />;
export const SolutionsPage = () => <Solutions />;
export const SolutionDetailPage = () => {
  const { solution } = useParams();
  return <SolutionPage slug={solution || ""} />;
};
import BookDemo from "@/pages/public/BookDemo";

export const PricingPage = () => <Pricing />;
export const BookDemoPage = () => <BookDemo />;
export const StartTrialPage = () => <BookingPage kind="trial" />;
export const ContactPage = () => <Contact />;
export const ResourcesPage = () => <Resources mode="resources" />;
export const CrmGuidePage = () => <Resources mode="guide" />;
export const BlogPage = () => <Resources mode="blog" />;
export const HelpCenterPage = () => <Resources mode="help" />;
export const DocumentationPage = () => <Resources mode="docs" />;
export const ProductUpdatesPage = () => <Resources mode="updates" />;
export const BlogArticlePage = () => {
  const { slug } = useParams();
  return <ArticlePage slug={slug || ""} />;
};
export const AboutPage = () => <About />;
export const SecurityPage = () => <Security />;
export const PrivacyPage = () => <LegalPage type="privacy" />;
export const TermsPage = () => <LegalPage type="terms" />;
export const CareersPage = () => <Careers />;
