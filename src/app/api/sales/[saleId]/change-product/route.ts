import { NextRequest, NextResponse } from "next/server";
import { createProductChange } from "@/lib/services/salesChangeService";
import { getLogger } from "@/lib/logger";

const log = getLogger("api-sales-change");

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ saleId: string }> }
) {
    try {
        // Unwrap params (NextJS 15+ requirement or just good practice if async)
        const { saleId } = await Promise.resolve(params);

        const body = await request.json();

        // Validation
        if (!body.originalItem || !body.newProduct || !body.newQuantity || !body.performedBy) {
            return NextResponse.json(
                { code: 400, message: "Missing required fields" },
                { status: 400 }
            );
        }

        const { originalItem, newProduct, newQuantity, reason, performedBy, performedByName } = body;

        log.info(`API request to change product for sale ${saleId}`);

        const result = await createProductChange({
            saleId,
            originalItem,
            newProduct,
            newQuantity,
            reason,
            performedBy,
            performedByName
        });

        if (!result.success) {
            return NextResponse.json(
                { code: 500, message: result.error || "Failed to process change" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            code: 200,
            message: "Product changed successfully",
            changeId: result.changeId
        });

    } catch (error) {
        log.error("Unexpected error in sales change API", error);
        return NextResponse.json(
            { code: 500, message: "Internal server error" },
            { status: 500 }
        );
    }
}
