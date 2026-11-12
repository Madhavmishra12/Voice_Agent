'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
    createWorkflowApiV1WorkflowCreateDefinitionPost,
    createWorkflowFromTemplateApiV1WorkflowCreateTemplatePost,
    updateWorkflowApiV1WorkflowWorkflowIdPut,
} from '@/client/sdk.gen';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import { detailFromError } from '@/lib/apiError';
import logger from '@/lib/logger';

const GROWQR_AGENT_CONTEXT = `GrowQR is an AI-powered career growth platform for students, job seekers, working professionals, career switchers, freelancers, and others looking to grow their careers. It brings specialized AI agents and personalized workflows together to help people build skills, strengthen their professional profiles, prepare resumes and interviews, practice workplace scenarios, and discover opportunities. The platform also offers human expert guidance. RQ means Readiness Quotient: a view of a person's skills, profile, experience, and career readiness. Relevant agents include resume support, interview practice, roleplay, skill training, brand building, and opportunity discovery. The public website currently says plans are coming soon and invites people to join the waitlist. Do not promise employment, guaranteed outcomes, or unavailable features; if a detail is uncertain, say so and direct the caller to growqr.ai or support@growqr.ai.`;

const DEFAULT_ACTIVITY_DESCRIPTION = `You are a warm, helpful GrowQR career growth assistant. Ask what the caller wants to achieve in their career, listen for their needs, and explain how GrowQR may help. Suggest relevant areas such as resume improvement, LinkedIn and professional branding, interview practice, roleplay, skill development, or finding opportunities. Keep the conversation natural and concise. For outbound calls, ask whether it is a good time to speak and respect a request to end the call.`;

export default function CreateWorkflowPage() {
    const router = useRouter();
    const { user, getAccessToken, logout } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [workflowId, setWorkflowId] = useState<string | null>(null);
    const [usedStarterFallback, setUsedStarterFallback] = useState(false);

    const [callType, setCallType] = useState<'inbound' | 'outbound'>('inbound');
    const [useCase, setUseCase] = useState('GrowQR Career Growth Assistant');
    const [openingLine, setOpeningLine] = useState('Hi, thanks for contacting GrowQR. What career goal would you like help with today?');
    const [activityDescription, setActivityDescription] = useState(DEFAULT_ACTIVITY_DESCRIPTION);

    const handleCallTypeChange = (value: string) => {
        const nextCallType = value as 'inbound' | 'outbound';
        setCallType(nextCallType);
        setOpeningLine(nextCallType === 'outbound'
            ? "Hi, I'm calling from GrowQR, the career growth platform. Is now a good time to talk about your career goals?"
            : 'Hi, thanks for contacting GrowQR. What career goal would you like help with today?');
    };

    const handleCreateWorkflow = async () => {
        if (!useCase || !activityDescription) {
            setError('Please fill in all fields');
            return;
        }

        if (!user) {
            setError('You must be logged in to create a workflow');
            return;
        }

        setIsLoading(true);
        setError(null);

        const completeInstructions = [
            openingLine.trim() ? `Opening line: ${openingLine.trim()}` : '',
            activityDescription.trim(),
            `Grounded GrowQR platform context: ${GROWQR_AGENT_CONTEXT}`,
        ].filter(Boolean).join('\n\n');

        try {
            const accessToken = await getAccessToken();

            let createdId: number | null = null;
            let templateWorkflowName = `${useCase} - ${callType}`;
            let templateError: unknown;

            try {
                const response = await createWorkflowFromTemplateApiV1WorkflowCreateTemplatePost({
                    body: {
                        call_type: callType,
                        use_case: useCase,
                        activity_description: completeInstructions,
                    },
                    headers: { Authorization: `Bearer ${accessToken}` },
                });

                if (response.error || !response.data?.id) {
                    templateError = response.error ?? new Error('Template service returned no workflow.');
                    const templateErrorMessage = detailFromError(templateError);
                    if (/invalid or expired token|invalid authorization token|authorization header required/i.test(templateErrorMessage)) {
                        throw new Error(templateErrorMessage);
                    }
                } else {
                    createdId = response.data.id;
                    templateWorkflowName = response.data.name;
                if (openingLine.trim()) {
                    const definition = response.data.workflow_definition as {
                        [key: string]: unknown;
                        nodes?: Array<{ type?: string; data?: { [key: string]: unknown } }>;
                    };
                    const nodes = definition.nodes?.map((node) =>
                        node.type === 'startCall' || node.data?.is_start === true
                            ? { ...node, data: { ...node.data, greeting: openingLine.trim() } }
                            : node,
                    );

                    if (nodes) {
                        const saveResponse = await updateWorkflowApiV1WorkflowWorkflowIdPut({
                            path: { workflow_id: response.data.id },
                            headers: { Authorization: `Bearer ${accessToken}` },
                            body: {
                                name: response.data.name,
                                workflow_definition: { ...definition, nodes },
                            },
                        });
                        if (saveResponse.error) {
                            const saveErrorMessage = detailFromError(saveResponse.error);
                            if (/invalid or expired token|invalid authorization token|authorization header required/i.test(saveErrorMessage)) {
                                throw new Error(saveErrorMessage);
                            }
                            logger.warn(`Created GrowQR agent, but could not save the exact opening line: ${saveErrorMessage}`);
                        }
                    }
                }
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : detailFromError(err);
                if (/invalid or expired token|invalid authorization token|authorization header required/i.test(message)) {
                    throw err;
                }
                templateError = err;
            }

            if (!createdId) {
                // The AI template service may be unavailable in local/self-hosted
                // setups. Still create a usable call workflow with the exact
                // greeting and instructions the user entered.
                const starterResponse = await createWorkflowApiV1WorkflowCreateDefinitionPost({
                    headers: { Authorization: `Bearer ${accessToken}` },
                    body: {
                        name: templateWorkflowName,
                        workflow_definition: {
                            nodes: [{
                                id: '1',
                                type: 'startCall',
                                position: { x: 175, y: 60 },
                                data: {
                                    greeting: openingLine.trim() || 'Hello, how can I help you today?',
                                    prompt: `Call direction: ${callType}.\n\n${completeInstructions}`,
                                    name: 'start call',
                                    allow_interrupt: true,
                                    invalid: false,
                                    validationMessage: null,
                                    add_global_prompt: false,
                                    delayed_start: false,
                                    is_start: true,
                                    selected_through_edge: false,
                                    hovered_through_edge: false,
                                    extraction_enabled: false,
                                    selected: false,
                                    dragging: false,
                                },
                            }],
                            edges: [],
                            viewport: { x: 0, y: 0, zoom: 1 },
                        },
                    },
                });

                if (starterResponse.error || !starterResponse.data?.id) {
                    throw new Error(detailFromError(starterResponse.error, 'Could not create the voice agent.'));
                }
                createdId = starterResponse.data.id;
                setUsedStarterFallback(true);
                logger.warn(`GrowQR AI template service unavailable; created a starter workflow instead: ${detailFromError(templateError, 'No template response')}`);
            }

            setWorkflowId(String(createdId));
            setShowSuccessModal(true);
        } catch (err) {
            const message = err instanceof Error ? err.message : detailFromError(err, 'Failed to create workflow. Please try again.');
            if (/invalid or expired token|invalid authorization token|authorization header required/i.test(message)) {
                setError('Your sign-in session has expired. Please sign in again to create an agent.');
                logger.warn('Agent creation stopped because the local sign-in token is no longer valid.');
                await logout();
                return;
            }
            setError(message);
            logger.error(`Error creating workflow: ${message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleModalContinue = () => {
        if (!workflowId) return;
        router.push(`/workflow/${workflowId}?onboarding=web_call`);
    };

    return (
        <>
            <PageShell width="narrow">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-2">Create Voice Agent</h1>
                    <p className="text-muted-foreground">
                        Tell us about your use case and we&apos;ll create a customized voice agent for you
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Agent Details</CardTitle>
                        <CardDescription>
                            Configure your voice agent settings
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="call-type">Call Type</Label>
                            <Select value={callType} onValueChange={handleCallTypeChange}>
                                <SelectTrigger id="call-type">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="inbound">
                                        Inbound (Users call AI)
                                    </SelectItem>
                                    <SelectItem value="outbound">
                                        Outbound (AI calls users)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                                Choose whether users will call your AI or your AI will call users
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="use-case">Use Case</Label>
                            <Input
                                id="use-case"
                                placeholder="e.g., Lead Qualification, HR Screening, Customer Support"
                                value={useCase}
                                onChange={(e) => setUseCase(e.target.value)}
                            />
                            <p className="text-sm text-muted-foreground">
                                Describe the primary purpose of your voice agent
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="opening-line">What should the agent say first?</Label>
                            <Textarea
                                id="opening-line"
                                placeholder="e.g., Hi, this is Maya calling from Acme. Is now a good time to talk?"
                                value={openingLine}
                                onChange={(e) => setOpeningLine(e.target.value)}
                                className="min-h-[80px]"
                            />
                            <p className="text-sm text-muted-foreground">
                                This becomes the agent&apos;s opening line when the call connects.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="activity-description">What should the agent do during the call?</Label>
                            <Textarea
                                id="activity-description"
                                placeholder="Describe what to ask, what information to collect, how to respond, and how to end the call. Include the agent's tone and any rules it should follow."
                                value={activityDescription}
                                onChange={(e) => setActivityDescription(e.target.value)}
                                className="min-h-[140px]"
                            />
                            <p className="text-sm text-muted-foreground">
                                These instructions and your opening line will guide the agent&apos;s conversation.
                            </p>
                        </div>

                        <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                            <p className="text-sm font-medium">GrowQR facts included for the agent</p>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Career growth platform for skills, professional profiles, resumes, interviews, roleplay, and opportunity discovery. RQ means Readiness Quotient. Plans are currently listed as coming soon. The agent is instructed not to promise jobs or guaranteed results.
                            </p>
                        </div>

                        {error && (
                            <p className="text-sm text-red-500">{error}</p>
                        )}

                        <div className="pt-4">
                            <Button
                                onClick={handleCreateWorkflow}
                                disabled={isLoading || !useCase || !activityDescription}
                                className="w-full"
                            >
                                {isLoading ? 'Creating...' : 'Create Agent'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </PageShell>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <Card className="w-full max-w-md p-8">
                        <div className="flex flex-col items-center space-y-6">
                            {/* Animated spinner */}
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-muted rounded-full"></div>
                                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
                            </div>

                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-semibold">
                                    Creating Your Workflow
                                </h3>
                                <p className="text-sm text-muted-foreground max-w-xs">
                                    We&apos;re setting up your voice agent with your specifications. This will just take a moment...
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Success Modal */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Workflow Created Successfully!
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="mt-4 space-y-3">
                                <p>
                                    {usedStarterFallback
                                        ? 'Your GrowQR call agent and its opening line have been created. You can add more conversation steps and tools in the editor.'
                                        : 'Your GrowQR voice agent has been created with the conversation instructions you provided.'}
                                </p>
                                <p>
                                    You can review and adjust the agent prompt, greeting, voice, and call setup in the editor.
                                </p>
                                <p>
                                    Open the agent to review and test the call flow before connecting a phone number.
                                </p>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6">
                        <Button
                            onClick={handleModalContinue}
                            className="w-full"
                        >
                            Open and Test Agent
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
